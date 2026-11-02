import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessRule } from './models';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps signed-in users away from the login page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};

/** Route `data: { access: AccessRule }` — UX gate only; the API still enforces RBAC. */
export const accessGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const rule = route.data['access'] as AccessRule | undefined;
  return auth.allows(rule) ? true : router.createUrlTree(['/forbidden']);
};
