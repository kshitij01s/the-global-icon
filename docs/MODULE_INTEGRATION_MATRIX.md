# Module Integration Matrix

Statuses reflect code review and live API checks (refined 2026-11-07 after full platform audit).

| Module | Frontend | Backend API | AuthZ | DB model | Surface | Status |
|--------|----------|-------------|-------|----------|---------|--------|
| Dashboard stats | `/` | `GET /admin/dashboard` | `dashboard.view` | Aggregates | R | **Working** |
| Magazines list/edit | Magazines pages | `/admin/magazines` | magazines.* | `Magazine` | CRUD+publish | **Working** |
| PDF / cover upload | Magazine form | `/admin/uploads/*` | magazines.create | Storage files | C | **Working** |
| Editions archive | `/editions` | Magazines list mode | magazines.read_admin | Magazine + series | R | **Partially Working** (archive view, not Edition CRUD) |
| Stories | `/articles` | `/admin/articles` full CRUD | articles.* | `Article` | List + publish/delete | **Partially Working** (create/edit UI missing) |
| Leaders | `/leaders` | `/admin/leaders` full CRUD | leaders.manage | `Leader` | List + publish/delete | **Partially Working** (create/edit UI missing) |
| CMS pages | `/pages/:slug` | `/admin/pages` | pages.* | `ManagedPage` | RU+publish | **Partially Working** (`pages.publish` is Super Admin–only by default) |
| Announcements | `/announcements` | `/admin/announcements` | site.manage | Announcement | CRUD | **Working** |
| Site settings | `/settings` | `/admin/settings` | site.* | `SiteSettings` | RU | **Partially Working** (featured picks / homepage sections not in UI) |
| Ads list + analytics | `/ads` | GET list + report only | ads.manage | `Advertisement` | R | **Partially Working** (no create/update API or UI) |
| Enquiries | `/enquiries` | status/notes/assign | enquiries.* | `Enquiry` | RU | **Partially Working** (assign API unused in UI) |
| Users | `/users` | activate + **PUT roles** | users.* | `User` | Partial | **Partially Working** (role editor UI missing) |
| Themes | `/themes` | `/admin/themes` | themes.* | Theme models | RU | **Working** (write paths Super Admin–gated) |
| Festival Theme Studio | `/theme-studio` | theme studio APIs | themes.* | Festival models | CRUD schedule | **Working** (schedule/manage Super Admin) |
| API Inbox | `/api-inbox` | `/admin/api-inbox` | api_inbox.* | `ApiInboxItem` | RU | **Working** |
| Invoices | `/finance/invoices` | — | — | — | Disclosure page | **Not Implemented** |
| RSS | Public feed URL | `/rss/articles.xml` | public | Articles | R | **Working** (no admin config UI) |
| Audit log UI | — | `writeAudit` only | `audit.view` unused | `AuditLog` | C | **Not Implemented** |
| Notifications center | — | Inbox email cooldown log | — | emailSentAt | — | **Not Implemented** |
| Homepage sections / partners | — | models exist | — | `HomepageSection`, `Partner` | — | **Not Implemented** (admin UI) |
| Public React site | Vite app | Public APIs | public / optional JWT | Same DB | R | **Working** |

## Legend

- **Working** — usable end-to-end for the intended primary workflow.
- **Partially Working** — backend and/or list UI exist; create/edit or secondary actions incomplete.
- **Not Implemented** — no product surface (or disclosure-only page).
