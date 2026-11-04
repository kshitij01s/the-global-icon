# Authentication & Role Access

## Shared system

React (`:5173`) and Angular (`:4200`) use the **same** NestJS auth API (`:4000/api/auth`).

| Piece | Storage | Notes |
|-------|---------|-------|
| Access JWT | React: memory · Angular: `localStorage` (`tgi_admin_*`) | Short-lived Bearer |
| Refresh token | httpOnly cookie `tgi_refresh` on API host (`path=/api/auth`) | Shared across both frontends via `credentials: include` |

CORS origins (dev): `http://localhost:5173`, `http://localhost:4200` with credentials. No wildcard.

## Login body

```json
{ "identifier": "email-or-username", "password": "…" }
```

## Role redirects (public Sign In)

After successful authentication, React inspects **server-returned** `user.roles` / `user.permissions`:

| Account | Redirect |
|---------|----------|
| Public / READER | Stay on React (`next` query or `/`) |
| Staff (`SUPER_ADMIN` **or** `dashboard.view`) | Hard navigate to `VITE_ADMIN_URL` (default `http://localhost:4200`) |

Role selectors in the browser never grant access. Angular still rejects non-staff sessions (`NoAdminAccessError`).

## Angular boot bridge

`AuthService.initialize()` always attempts cookie refresh when no access token is stored, so a staff login on the public site opens the Admin dashboard without a second password prompt.

## Permissions

Backend JWT + permission guards enforce Admin vs Super Admin. Hiding UI is not sufficient.

## Development staff accounts

Created by `apps/api/scripts/reset-staff-users.js` into gitignored `apps/api/.superadmin-local.txt`.

Do **not** commit passwords. Do **not** enable that script in production pipelines without review.
