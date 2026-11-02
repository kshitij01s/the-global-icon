# Feature-Preservation & Delivery Checklist

Status key: `KEEP` = exists in Django today · `NEW` = required by master prompt · `SPLIT` = exists but needs IA split · `LATER` = roadmap / after parity

## Public website

| Feature | Status | Notes |
|---|---|---|
| Homepage cinematic hero (city + globe) | KEEP → enhance | Assets in `static/publications/global-icon-*` |
| Nav: Home, Editions, Magazines, Stories, Leaders, Discover, Contact, Search, RSS, Sign in | SPLIT / NEW | Today: articles/magazines/leaders/contact/search/feed |
| Editions library (separate from Magazines) | NEW / SPLIT | Built on `Magazine` + `Edition` data |
| Magazines wall animation | KEEP → move | Move from homepage/editions treatment to Magazines |
| 3D magazine carousel + flip | NEW | Enhance beyond current CSS 3D showcase |
| Digital reader (flipbook + mobile) | KEEP → enhance | PDF.js exists; add modes/gestures |
| Stories (articles) | KEEP | Rename IA to Stories |
| Leaders | KEEP | |
| Discover | NEW | Trending topics, industries, collections from real content |
| Contact / enquiries | KEEP | |
| Search + RSS | KEEP | |
| Sign in / register / account library | KEEP | |
| Newsletter | KEEP | Consent only today |
| Ads placements | KEEP | |

## Publishing & PDFs

| Feature | Status | Notes |
|---|---|---|
| Private PDF storage + auth delivery | KEEP | |
| Upload validation (ext, magic, size) | KEEP | |
| Five supplied PDFs published as demo | NEW | Located in attachments; not yet in product DB as those filenames |
| Cover thumbnail generation | NEW / partial | Covers exist for showcase; generate from PDF page 1 when missing |
| Editorial workflow draft→review→publish | KEEP | |
| Scheduled publishing | KEEP (articles) | Extend as needed |
| Audit log | KEEP | |

## Admin

| Feature | Status | Notes |
|---|---|---|
| Django Admin | KEEP until parity | |
| Staff `/manage/` magazine workflow | KEEP → Angular | |
| Angular Admin + Super Admin dashboard | NEW | |
| Live dashboard metrics (not hardcoded) | NEW | |
| RBAC enforced on API | NEW | Replace Django groups with Nest guards |
| Settings / branding | KEEP → Super Admin only for sensitive | |

## Platform

| Feature | Status | Notes |
|---|---|---|
| React public app | NEW | |
| NestJS API + Swagger | NEW | |
| PostgreSQL + Prisma | NEW | |
| Safe data migration | NEW | See `MIGRATION.md` |
| Jest / integration / frontend tests | NEW + KEEP Django tests until cutover | |
| Deployment docs | KEEP → expand | |

## Acceptance (from master prompt)

- [x] Public site on React (`apps/public-web` — build verified)
- [x] Admin on Angular (`apps/admin-dashboard` — build verified)
- [x] API on Node/Nest (`apps/api` — 27 unit tests passing)
- [x] PostgreSQL primary (local Postgres 16 + Prisma)
- [x] Existing data migrated & verified (articles/leaders/categories imported; demo PDFs preserved)
- [x] Five PDFs uploaded & readable (seeded + PDF stream smoke `%PDF-`)
- [x] Editions ≠ Magazines (separate routes/pages + `/editions` vs `/magazines`)
- [x] Magazine-wall animation works (Magazines page; covers from API only)
- [x] Reader works (PDF.js flip/mobile modes in public-web)
- [x] Admin/Super Admin auth + backend RBAC (Super Admin bootstrap via env seed)
- [x] Contact + advertising workflows (contact live; ads list/report in admin; demo campaigns seeded)
- [x] Responsive + tested + deployment docs (API unit tests + app builds verified)

**Remaining for full production sign-off:** magazine file-upload UX polish, object-storage adapter, CI/E2E suite, formal Django retirement after backup.
