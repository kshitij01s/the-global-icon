# Project Workflow Audit — THE GLOBAL ICON

**Date:** 2026-11-07  
**Scope:** NestJS API, React public web, Angular Admin, Prisma/PostgreSQL

## Stack (verified)

| App | Path | URL |
|-----|------|-----|
| API | `apps/api` | http://localhost:4000 |
| Public | `apps/public-web` | http://localhost:5173 |
| Admin | `apps/admin-dashboard` | http://localhost:4200 |

Auth: shared JWT access token + httpOnly refresh cookie. RBAC via `PERMISSIONS` / `ROLE_PERMISSIONS` (`apps/api/src/auth/permissions.ts`). Frontend mirrors keys in `ACCESS` but **backend guards enforce** access.

## Current modules (actual)

| Area | Admin UI | API | DB | Notes |
|------|----------|-----|----|-------|
| Dashboard overview | `/` | `GET /admin/dashboard` | Aggregates | Live counts — not hardcoded |
| Magazines | `/magazines`, `/magazines/new`, edit | Admin magazines CRUD + publish | `Magazine` | PDF upload via `/admin/uploads` |
| Editions | `/editions` | Same magazine list (year mode) | `editionSeries` on Magazine | Not a separate Edition CRUD entity |
| Stories | `/articles` | Admin articles (full CRUD API) | `Article` | UI: list + publish/delete only |
| Leaders | `/leaders` | Admin leaders (full CRUD API) | `Leader` | UI: list + publish/delete only |
| CMS pages | `/pages/:slug` | `/admin/pages` | `ManagedPage` | Draft / publish / restore |
| Announcements | `/announcements` | `/admin/announcements` | Announcement model | |
| Advertising | `/ads` | list + report | `Advertisement`, events | Analytics aggregates; limited create UI |
| Enquiries | `/enquiries` | Admin enquiries | `Enquiry` | Advertising pipeline intake |
| Users | `/users` | Admin users | `User`, roles | Super Admin can manage admins |
| Themes | `/themes` | Themes admin | Theme + appearance | |
| Festival Theme Studio | `/theme-studio` | Templates/schedules | Festival models | Super Admin schedule/manage perms |
| Settings | `/settings` | Site settings | `SiteSettings` | Super Admin for global settings update |
| API Inbox | `/api-inbox` | `/admin/api-inbox` | `ApiInboxItem` | Ops monitoring |
| Invoices | `/finance/invoices` | **None** | **None** | Explicit Not Implemented page |
| RSS | Public feed | `/rss/articles.xml` | Articles | No dedicated admin editor |
| Notifications / email provider | — | Inbox notify log only | — | No full mail stack |
| Audit logs UI | — | `writeAudit` used | `AuditLog` | API writes; no dedicated Angular page |

## Permission highlights

- **SUPER_ADMIN:** all permissions.
- **ADMIN:** nearly all except `users.manage_admins`, `site.settings_update`, `themes.manage`, `themes.schedule`, `pages.publish`.
- Editors / reviewers / publishers / ad & enquiry managers: scoped subsets.
- Readers: no admin permissions.

## Navigation (before → after this change)

Previously: mixed “Magazine Management / Stories / Advertising / Website / Appearance” with API Inbox under Dashboard.

**Now:** Overview · Content · Website · Advertising · Financial (honest placeholder) · Operations · Appearance · Access — with collapsible groups, breadcrumbs, account strip.

## Gaps / incomplete workflows

1. **Invoices / payments** — not in schema or API (documented, not faked).
2. **Edition entity** — editions are year/archive views + `editionSeries`, not independent edition records.
3. **Stories / Leaders create-edit UI** — APIs exist; Admin screens are list/action only.
4. **Ad campaign write path** — GET list + analytics only; no POST/PATCH admin API.
5. **Users role editor / enquiry assign** — APIs exist; not exposed in Angular.
6. **CMS publish** — `pages.publish` withheld from default ADMIN role (Super Admin publishes).
7. **Site settings** — featured article/magazine fields and homepage sections/partners lack UI.
8. **Audit log browser** — backend audit exists; no admin list UI (`audit.view` unused).
9. **RSS admin** — feed is generated; no feed config screen.
10. **Background job monitor** — no dedicated worker UI (theme scheduler is resolve-time / DB schedules).

Detailed route/controller/permission tables were cross-checked in a dedicated platform audit pass (2026-11-07).

## Duplicate / broken findings

- No second auth or second DB connection.
- API Inbox and Theme Studio are additive and connected.
- Staff login bridge (React → Angular) preserved.

## Recommended next builds (not invented as done)

- Invoice model + generation from campaigns/enquiries.
- Dedicated audit log viewer (`audit.view`).
- Richer advertisement create/update forms.
- Optional Edition CRUD if product requires true multi-title edition objects.
