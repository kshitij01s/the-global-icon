import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subscription, catchError, of, timer } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { AdminApiService, ApiInboxAlerts } from './admin-api.service';
import { AuthService } from './auth.service';

const POLL_MS = 45_000;

@Injectable({ providedIn: 'root' })
export class ApiInboxAlertsService implements OnDestroy {
  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AuthService);
  private sub?: Subscription;

  private readonly alertsSig = signal<ApiInboxAlerts | null>(null);
  readonly alerts = this.alertsSig.asReadonly();
  readonly openCount = computed(() => this.alertsSig()?.openCount ?? 0);
  readonly criticalCount = computed(() => this.alertsSig()?.criticalCount ?? 0);
  readonly warningCount = computed(() => this.alertsSig()?.warningCount ?? 0);

  start(): void {
    if (this.sub || !this.auth.allows({ anyPermissions: ['api_inbox.view', 'api_inbox.manage'] })) {
      return;
    }
    this.sub = timer(0, POLL_MS)
      .pipe(
        switchMap(() => {
          if (!this.auth.isAuthenticated()) return of(null);
          if (!this.auth.allows({ anyPermissions: ['api_inbox.view', 'api_inbox.manage'] })) {
            return of(null);
          }
          return this.api.apiInboxAlerts().pipe(catchError(() => of(null)));
        }),
        tap((data) => {
          if (data) this.alertsSig.set(data);
        }),
      )
      .subscribe();
  }

  refresh(): void {
    if (!this.auth.allows({ anyPermissions: ['api_inbox.view', 'api_inbox.manage'] })) return;
    this.api.apiInboxAlerts().subscribe({
      next: (data) => this.alertsSig.set(data),
      error: () => undefined,
    });
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.sub = undefined;
    this.alertsSig.set(null);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
