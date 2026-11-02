# THE GLOBAL ICON — API map

Base URL (dev): `http://localhost:4000/api`  
Swagger: `http://localhost:4000/docs`

## Public

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/site/homepage` | Homepage payload |
| GET | `/site/settings` | Public branding |
| GET | `/magazines` | Magazine showcase library |
| GET | `/magazines/:slug` | Detail |
| GET | `/magazines/:slug/pdf` | Authorized PDF stream (range) |
| POST | `/magazines/:slug/progress` | Continue reading (auth) |
| GET | `/editions` | Editions library shaping of magazines |
| GET | `/articles` | Stories |
| GET | `/articles/:slug` | Story detail |
| GET | `/leaders` | Leaders |
| GET | `/leaders/:slug` | Leader detail |
| GET | `/search?q=` | Published-only search |
| POST | `/contact` | Enquiry |
| POST | `/newsletter/subscribe` | Consent signup |
| POST | `/newsletter/unsubscribe` | Token unsubscribe |
| GET | `/rss/articles.xml` | RSS |
| GET | `/media/covers/...` | Public cover images only |

## Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Reader only — cannot set roles |
| POST | `/auth/login` | `{ identifier, password }` → access token; refresh httpOnly cookie |
| POST | `/auth/refresh` | Rotating refresh |
| POST | `/auth/logout` | Revoke refresh |
| GET | `/auth/me` | Current user + roles/permissions |

## Admin (JWT + permission)

| Method | Path | Permission / role |
|---|---|---|
| GET | `/admin/dashboard` | `dashboard.view` |
| CRUD | `/admin/magazines` | magazine permissions |
| CRUD | `/admin/articles` | article permissions |
| CRUD | `/admin/leaders` | `leaders.manage` |
| GET/PATCH | `/admin/enquiries` | enquiry permissions |
| GET/PATCH | `/admin/users` | `users.manage` (role elevation restricted) |
| GET/PATCH | `/admin/settings` | Super Admin for write |
| GET | `/admin/categories` | staff |
| GET | `/admin/edition-series` | staff |
| POST | `/admin/uploads` | PDF/image upload validation |
| GET | `/admin/advertisements` | ad managers |

All privileged authorization is enforced in Nest guards — Angular/React guards are UX only.
