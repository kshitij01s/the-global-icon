import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService, SILENT_AUTH } from './auth.service';

/** Credential endpoints never get a Bearer header and never trigger refresh-and-retry. */
const CREDENTIAL_ENDPOINT = /\/auth\/(login|refresh|logout)$/;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const credentialCall = CREDENTIAL_ENDPOINT.test(req.url);

  const decorate = (r: HttpRequest<unknown>) => {
    const token = auth.token();
    return r.clone({
      withCredentials: true,
      setHeaders: token && !credentialCall ? { Authorization: `Bearer ${token}` } : {},
    });
  };

  return next(decorate(req)).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || credentialCall) {
        return throwError(() => err);
      }
      // Access token expired or invalid: try the refresh cookie once, then retry the request.
      return auth.refreshSession().pipe(
        switchMap((ok) => {
          if (ok) return next(decorate(req));
          auth.clearSession();
          if (!req.context.get(SILENT_AUTH) && !router.url.startsWith('/login')) {
            void router.navigate(['/login'], {
              queryParams: { returnUrl: router.url, reason: 'expired' },
            });
          }
          return throwError(() => err);
        }),
      );
    }),
  );
};
