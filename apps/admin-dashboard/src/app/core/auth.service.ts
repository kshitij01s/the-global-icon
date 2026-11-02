import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { AccessRule, AuthUser, LoginResponse, RoleName } from './models';

const TOKEN_KEY = 'tgi_admin_access_token';
const USER_KEY = 'tgi_admin_user';

/** Set on requests that must not trigger a redirect to /login when they fail with 401. */
export const SILENT_AUTH = new HttpContextToken<boolean>(() => false);

/** Thrown when valid credentials belong to an account without any admin permissions. */
export class NoAdminAccessError extends Error {
  constructor() {
    super('This account does not have access to the admin dashboard.');
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: session stays in memory only */
  }
}

function readUser(): AuthUser | null {
  const raw = read(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** Mirror of the API's permission model: SUPER_ADMIN passes every check. */
function canUser(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  return user.roles.includes('SUPER_ADMIN') || user.permissions.includes(permission);
}

function isStaff(user: AuthUser): boolean {
  return user.roles.includes('SUPER_ADMIN') || user.permissions.includes('dashboard.view');
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.apiUrl;

  private readonly tokenSig = signal<string | null>(read(TOKEN_KEY));
  private readonly userSig = signal<AuthUser | null>(readUser());
  private refreshInFlight$?: Observable<boolean>;

  readonly user = this.userSig.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSig() && !!this.userSig());
  readonly displayName = computed(() => {
    const u = this.userSig();
    if (!u) return '';
    const full = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return full || u.username;
  });
  readonly primaryRole = computed(() => {
    const roles = this.userSig()?.roles ?? [];
    const order: RoleName[] = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'REVIEWER', 'PUBLISHER', 'AD_MANAGER', 'ENQUIRY_MANAGER'];
    return order.find((r) => roles.includes(r)) ?? roles[0] ?? null;
  });

  token(): string | null {
    return this.tokenSig();
  }

  can(permission: string): boolean {
    return canUser(this.userSig(), permission);
  }

  hasRole(...roles: RoleName[]): boolean {
    const u = this.userSig();
    return !!u && (u.roles.includes('SUPER_ADMIN') || roles.some((r) => u.roles.includes(r)));
  }

  /** UX-only gate (the API enforces the real RBAC). */
  allows(rule: AccessRule | undefined): boolean {
    if (!rule) return true;
    const permsOk = !rule.anyPermissions?.length || rule.anyPermissions.some((p) => this.can(p));
    const rolesOk = !rule.roles?.length || this.hasRole(...rule.roles);
    return permsOk && rolesOk;
  }

  login(identifier: string, password: string): Observable<AuthUser> {
    return this.http
      .post<LoginResponse>(`${this.base}/auth/login`, { identifier, password }, { withCredentials: true })
      .pipe(switchMap((res) => this.acceptSession(res)));
  }

  /** Uses the httpOnly refresh cookie. Resolves true when a new access token was issued. */
  refreshSession(): Observable<boolean> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<LoginResponse>(`${this.base}/auth/refresh`, {}, { withCredentials: true })
        .pipe(
          switchMap((res) => this.acceptSession(res)),
          map(() => true),
          catchError(() => {
            this.clearSession();
            return of(false);
          }),
          finalize(() => (this.refreshInFlight$ = undefined)),
          shareReplay(1),
        );
    }
    return this.refreshInFlight$;
  }

  /** Runs before the app boots: validates a stored token, silently refreshing it if needed. */
  initialize(): Observable<unknown> {
    if (!this.tokenSig()) return of(null);
    return this.http
      .get<{ user: AuthUser }>(`${this.base}/auth/me`, {
        context: new HttpContext().set(SILENT_AUTH, true),
      })
      .pipe(
        tap((res) => this.setUser(res.user)),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
      );
  }

  logout(): void {
    this.http
      .post(`${this.base}/auth/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe();
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  clearSession(): void {
    this.tokenSig.set(null);
    this.userSig.set(null);
    write(TOKEN_KEY, null);
    write(USER_KEY, null);
  }

  private acceptSession(res: LoginResponse): Observable<AuthUser> {
    if (!isStaff(res.user)) {
      // Valid account but no admin rights (e.g. a public READER). Revoke the refresh cookie again.
      return this.http.post(`${this.base}/auth/logout`, {}, { withCredentials: true }).pipe(
        catchError(() => of(null)),
        switchMap(() => throwError(() => new NoAdminAccessError())),
      );
    }
    this.tokenSig.set(res.accessToken);
    write(TOKEN_KEY, res.accessToken);
    this.setUser(res.user);
    return of(res.user);
  }

  private setUser(user: AuthUser): void {
    this.userSig.set(user);
    write(USER_KEY, JSON.stringify(user));
  }
}
