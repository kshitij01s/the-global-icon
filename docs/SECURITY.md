# Security notes — modern stack

## Authentication

- Passwords hashed with bcrypt.
- Short-lived JWT access tokens.
- Refresh tokens stored hashed, delivered as HTTP-only cookies, rotated on use, revocable.
- Public registration creates **READER** only. Role fields in registration bodies are rejected.
- Super Admin is bootstrapped only when `SUPER_ADMIN_PASSWORD` is set in the API environment, then `npm run prisma:seed`. Never commit that password.

## Authorization

- Backend RBAC via roles + permission keys.
- Admin cannot self-elevate to `SUPER_ADMIN`.
- Unpublished / member-only PDFs are streamed only after access checks.
- Cover images use a separate public media route; PDF keys are never returned as filesystem paths.

## Uploads

- PDF: extension + magic-byte (`%PDF`) validation, size limit.
- Images: MIME allow-list + size limit.
- Stored under `STORAGE_ROOT`; path traversal blocked.

## Operational

- Helmet, validation pipe, throttling enabled.
- Production: Swagger disabled; CORS must be configured; referrer / frame headers tightened.
- CORS limited to configured origins.
- No secrets in git (`.env`, `.superadmin-local.txt` ignored).
- Django legacy app remains until cutover; do not expose both admin surfaces in production without a clear cutover plan.

## Public content deterrents

- Client-side copy / right-click / drag / DevTools shortcut deterrents on the React site (CIO Today–comparable UX).
- Does **not** replace server auth; screenshots cannot be fully blocked by any website.
- Details: [CONTENT_PROTECTION.md](CONTENT_PROTECTION.md).
