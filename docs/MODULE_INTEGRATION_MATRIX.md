# Module Integration Matrix

Statuses reflect verification against code and live API behavior (2026-11-07).

| Module | Frontend | Backend API | AuthZ | DB model | CRUD | Status |
|--------|----------|-------------|-------|----------|------|--------|
| Dashboard stats | `/` | `GET /admin/dashboard` | `dashboard.view` | Aggregates | R | **Working** |
| Magazines list/edit | Magazines pages | `/admin/magazines` | magazines.* | `Magazine` | CRUD+publish | **Working** |
| PDF / cover upload | Magazine form | `/admin/uploads/*` | magazines.create | Storage files | C | **Working** |
| Editions archive | `/editions` | Magazines list mode | magazines.read_admin | Magazine + series | R | **Partially Working** (archive view, not Edition CRUD) |
| Stories | `/articles` | `/admin/articles` | articles.* | `Article` | CRUD+publish | **Working** |
| Leaders | `/leaders` | `/admin/leaders` | leaders.manage | `Leader` | CRUD | **Working** |
| CMS pages | `/pages/:slug` | `/admin/pages` | pages.* | `ManagedPage` | RU+publish | **Working** |
| Announcements | `/announcements` | `/admin/announcements` | site.manage | Announcement | CRUD | **Working** |
| Site settings | `/settings` | `/admin/settings` | site.* | `SiteSettings` | RU | **Working** |
| Ads list + analytics | `/ads` | `/admin/advertisements` | ads.manage | `Advertisement` | R (+ report) | **Partially Working** (limited write UI) |
| Enquiries | `/enquiries` | `/admin/enquiries` | enquiries.* | `Enquiry` | RU | **Working** |
| Users | `/users` | `/admin/users` | users.* | `User` | RU | **Working** |
| Themes | `/themes` | `/admin/themes` | themes.* | Theme models | RU | **Working** |
| Festival Theme Studio | `/theme-studio` | theme studio APIs | themes.* | Festival models | CRUD schedule | **Working** |
| API Inbox | `/api-inbox` | `/admin/api-inbox` | api_inbox.* | `ApiInboxItem` | RU | **Working** |
| Invoices | `/finance/invoices` | — | — | — | — | **Not Implemented** |
| RSS | Public / feed URL | `/rss/articles.xml` | public | Articles | R | **Working** (no admin config UI) |
| Audit log UI | — | `writeAudit` | audit.view unused in UI | `AuditLog` | C | **Not Implemented** (writes only) |
| Notifications center | — | Inbox email cooldown log | — | emailSentAt | — | **Not Implemented** |
| Public React site | Vite app | Public APIs | public / optional JWT | Same DB | R | **Working** |

## Legend

- **Working** — end-to-end path exists and persists.
- **Partially Working** — usable but incomplete product surface.
- **Not Implemented** — no backend model/API; UI may honestly disclose gap.
