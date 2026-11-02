# Database (PostgreSQL + Prisma)

Schema: `apps/api/prisma/schema.prisma` · Seed: `apps/api/prisma/seed.ts` · Prisma config: `apps/api/prisma.config.ts`

## Schema overview

| Area | Models |
|---|---|
| Identity & RBAC | `User`, `Role` (enum `RoleName`), `Permission`, `UserRole`, `RolePermission`, `RefreshToken` (hashed, rotated) |
| Editorial | `Category`, `Author`, `Article` (draft → review → published workflow), `HomepageSection(+Article)` |
| Magazines | `Magazine` (cover key, private `pdfKey`, access PUBLIC/MEMBERS, review + publish state, `isDemo`), `EditionSeries`, `MagazineArticle`, `MagazineRelation` |
| People | `Leader` (linked to article / magazine / category) |
| Site | `SiteSettings` (singleton `id = 1`), `Announcement`, `Partner` |
| Engagement | `Enquiry`, `NewsletterSubscriber`, `ReaderPreference`, `Notification`, `SavedContent`, `ReadingHistory` |
| Ads | `Advertisement`, `AdvertisementEvent` |
| Ops | `AuditLog`, `DemoSeedRecord`, `MigrationIdMap` (Django → Prisma id mapping) |

Only **storage keys** (e.g. `magazines/pdfs/supplied/Magazine_1.pdf`, `demo-pdf-covers/Magazine_1-cover.png`)
are stored in the database. The API resolves them under `STORAGE_ROOT` and never returns filesystem paths.

## Setup

```powershell
cd apps/api
copy .env.example .env        # then set real JWT secrets (>= 32 random chars) and DATABASE_URL
npm run prisma:generate       # generate Prisma Client
npm run prisma:migrate        # prisma migrate dev  (creates the DB if missing, applies migrations, runs seed)
npm run prisma:seed           # idempotent seed (also runs automatically after migrate dev)
npm run prisma:deploy         # production: apply committed migrations only
```

From the repo root: `npm run db:migrate` and `npm run db:seed`.

> `.env` is git-ignored. Never commit real secrets. Use a unique strong password for production databases.

## What the seed does

1. Upserts all 9 roles and 19 core permissions and syncs the role → permission mapping
   (definition lives in `src/auth/permissions.ts`).
2. **Super Admin bootstrap only if `SUPER_ADMIN_PASSWORD` is set** (min 12 chars). Email/username come from
   `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_USERNAME`. An existing account's password is never overwritten.
   Public registration can only ever create `READER` accounts.
3. Seeds `SiteSettings` (THE GLOBAL ICON branding).
4. Creates 5 categories, the `Global Edition` series and **5 demo magazines** from the supplied PDFs
   (`docs/SUPPLIED_PDFS.md`): `isDemo=true`, `isPublished=true`, `reviewStatus=APPROVED`, `pageCount=9`,
   October 2026 issue dates. `Magazine_1` is explicitly labelled a **fictional demo edition**.

PDF binaries are not committed (`.gitignore`); copy the five supplied files into
`storage/development-only/magazines/pdfs/supplied/`. The seed warns if a referenced file is missing.

## Migrating the legacy Django data

```powershell
cd apps/api
npm run migrate:sqlite                    # dry run — reads ../../db.sqlite3 read-only, prints counts
npm run migrate:sqlite -- --apply         # write to PostgreSQL (idempotent via MigrationIdMap)
npm run migrate:sqlite -- --db path\to\db.sqlite3 --apply
```

The field mapping, what is migrated (categories, editions, authors, articles, magazines, leaders, newsletter,
non-staff users) and what is still TODO are documented at the top of `scripts/migrate-from-sqlite.ts`.
Django password hashes are never copied; migrated readers must reset their password.

## Notes

- Verified locally against PostgreSQL 16: `prisma migrate dev --name init` created `the_global_icon`, applied
  migration `…_init` and ran the seed successfully.
- Prisma is pinned to v6 (schema keeps `url = env("DATABASE_URL")`); upgrading to v7 needs driver adapters.
