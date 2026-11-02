# Data & Platform Migration Plan

**Source:** Django 5.2 + SQLite (`db.sqlite3`) or optional MySQL  
**Target:** NestJS + Prisma + PostgreSQL  
**Safety rule:** Never drop, truncate, or overwrite the source database. Migrate into a **new** PostgreSQL database only.

---

## 1. Pre-migration backup

1. Stop write-heavy admin activity during cutover windows.
2. Copy `db.sqlite3` to `backups/sqlite/db-YYYYMMDD-HHMMSS.sqlite3`.
3. If MySQL is in use, take a logical dump:
   - `mysqldump --single-transaction --routines --triggers -u … -p DATABASE > backups/mysql/…sql`
4. Archive `media/` (if present) and `private_media/` to `backups/media-…zip`.
5. Record file counts and SHA-256 for the five supplied demo PDFs and all published issue PDFs.

Rollback = restore SQLite/MySQL backup + media archive and continue serving Django. The new PostgreSQL database can be discarded safely.

---

## 2. Model mapping (Django → PostgreSQL / Prisma)

| Django model / table | Prisma model | Notes |
|---|---|---|
| `auth_user` | `User` | Map password hashes carefully; prefer re-hash on next login if algorithm incompatible, or use bcrypt-compatible verifier |
| `auth_group` / permissions | `Role`, `Permission`, `UserRole`, `RolePermission` | Collapse Django groups into RBAC roles: SUPER_ADMIN, ADMIN modules, READER, SUBSCRIBER |
| `publications_category` | `Category` | Direct |
| `publications_edition` | `EditionSeries` | Regional/series labels; public **Editions** library uses `Magazine`/`Publication` issues |
| `publications_author` | `Author` | Direct |
| `publications_article` | `Article` | Preserve status enum + `published_at` |
| `publications_magazine` | `Magazine` | Covers, private PDF path, review/publish fields |
| M2M related articles/magazines | join tables | Preserve IDs via mapping table during import |
| `publications_advertisement` | `Advertisement` | Direct |
| `publications_advertisementevent` | `AdvertisementEvent` | Aggregate only — no PII |
| `publications_featuredleader` | `Leader` | Direct |
| `publications_homepagesection` | `HomepageSection` | Direct |
| `publications_partnerorganization` | `Partner` | Direct |
| `publications_announcement` | `Announcement` | Direct |
| `publications_siteconfiguration` | `SiteSettings` | Singleton `id = 1` |
| `publications_clientenquiry` | `Enquiry` | Preserve reference codes |
| `publications_readerpreference` | `ReaderPreference` | Direct |
| `publications_usernotification` | `Notification` | Direct |
| `publications_newslettersubscriber` | `NewsletterSubscriber` | Preserve unsubscribe tokens |
| `publications_savedcontent` | `SavedContent` | Enforce XOR article/magazine |
| `publications_readinghistory` | `ReadingHistory` | Preserve `last_page` |
| `publications_managementauditevent` | `AuditLog` | Extend event types over time |
| `publications_demoseedrecord` | `DemoSeedRecord` | Dev only |

### Editions vs Magazines mapping note

In Django, `Edition` is a taxonomy and `Magazine` is the issue with PDF.  
In the new public IA:

- **Editions pages** query published magazines presented as an issue library (filters: featured/current/previous, issue number, date).
- **Magazines pages** query the same magazines for immersive showcase/reader UX.
- Do **not** duplicate rows to feed the cover wall; reuse cover URLs.

---

## 3. File path migration

| Source | Target |
|---|---|
| `private_media/magazines/pdfs/*` | `storage/development-only/magazines/pdfs/*` (dev) / object storage key (prod) |
| Cover / portrait / article images under media | `storage/development-only/public/...` or CDN |
| Five supplied PDFs | Copy into private storage once; create magazine records; generate cover thumbnails from page 1 |

Store DB fields as storage keys, never as absolute host paths that leak filesystem layout.

---

## 4. Migration script phases

1. **Schema** — apply Prisma migrations to empty PostgreSQL.
2. **Users & roles** — import users; map is_superuser → SUPER_ADMIN; staff groups → ADMIN permissions; Subscribers → SUBSCRIBER.
3. **Taxonomy** — categories, edition series, authors.
4. **Content** — articles, magazines, leaders, homepage sections, partners, announcements, site settings.
5. **Relations** — M2M related content, leader links, featured homepage FKs.
6. **Engagement** — newsletter, saved, history, notifications, preferences.
7. **Commercial** — enquiries, ads, ad events, audit log.
8. **Files** — copy media; rewrite keys; verify PDF open via authorized API.
9. **Verification** — compare counts, sample FK integrity, spot-check 20 public URLs, open all five demo PDFs.

Idempotency: maintain `migration_id_map(old_table, old_id, new_id)`.

---

## 5. Verification queries (examples)

- Count articles/magazines/leaders/users/enquiries source vs target.
- Count published magazines with non-null PDF key and existing file.
- Ensure no draft/member-only content appears in public list endpoints.
- Confirm Super Admin cannot be self-granted by Admin role APIs.

---

## 6. Cutover sequence

1. Freeze Django writes (maintenance banner optional).
2. Final backup + final incremental migrate.
3. Point `apps/api` at PostgreSQL; run smoke tests.
4. Serve React public + Angular admin.
5. Keep Django offline but **not deleted** for one verified release cycle.
6. Only after acceptance criteria pass, archive legacy code to `legacy-django/` (do not delete history).

---

## 7. Known environment blockers (audit)

- Local `.venv` points to missing `Python310` install — recreate venv before running Django verification.
- Node.js / PostgreSQL may need local install for Phase 2+.
- Do not commit `.env` secrets.
