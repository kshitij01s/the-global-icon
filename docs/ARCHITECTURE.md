# THE GLOBAL ICON — Architecture (Phase 1 Audit + Target Design)

**Brand:** THE GLOBAL ICON  
**Tagline:** Stories That Shape Tomorrow.  
**Audit date:** 2026-11-01  
**Rule:** Keep the existing Django application intact until the new stack reaches feature parity and data migration is verified.

---

## 1. Current system (as found)

| Layer | Technology |
|---|---|
| Public site | Django templates + static CSS/JS |
| Admin | Django Admin + custom `/manage/` staff dashboard |
| Language | Python 3.10 (venv currently broken — base interpreter missing) |
| Framework | Django 5.2 |
| Database (local) | SQLite (`db.sqlite3`) |
| Database (optional) | MySQL 8+ via PyMySQL |
| Auth | Django session auth + groups/permissions |
| PDF storage | `private_media/` via private `FileSystemStorage` |
| PDF reader | Vendored PDF.js |
| Tests | Django `TestCase` suite under `publications/` |

There is **no** React, Angular, NestJS/Express, Prisma, or PostgreSQL application in the repository yet.

### Repository layout (preserved)

```text
Magazine Project/
├── config/                 # Django settings, URLs, WSGI
├── publications/           # Models, views, forms, signals, management commands, tests
├── templates/              # Public + management + registration templates
├── static/publications/    # CSS, JS, logos, hero art, PDF.js, cover assets
├── private_media/          # Authorized magazine PDFs (not public)
├── docs/                   # Admin, deployment, MySQL migration, roadmap
├── db.sqlite3              # Local development database
├── manage.py
├── requirements.txt
└── Screenshot / brand PNGs # Design references
```

### Supplied assets located

| Asset | Location |
|---|---|
| Magazine-wall reference | `Screenshot 2026-10-28 182213.png` (+ related screenshots) |
| Brand / hero art | `The Global Icon_ Stories That Shape Tomorrow.png`, `static/publications/global-icon-*` |
| Demo PDFs (5 supplied) | Cursor attachments `.../attachments/c302953e-a29c-4c7e-8fcd-0661de438164/` — `Magazine_1.pdf` … `magazine_5.pdf` (all valid `%PDF-1.4`) |
| Existing private PDFs | `private_media/magazines/pdfs/` (test + demo reader samples; many hashed copies) |

---

## 2. Existing domain model

Primary Django models in `publications/models.py`:

| Model | Purpose |
|---|---|
| `Category` | Editorial / publication taxonomy |
| `Edition` | Regional / series edition labels (not a separate public “Editions” site section yet) |
| `Author` | Article authors (optional user link) |
| `Article` | Stories with draft → review → approved → scheduled → published → archived |
| `Magazine` | Digital issues with cover, private PDF, access, review/publish workflow |
| `Advertisement` / `AdvertisementEvent` | Time-windowed placements + aggregate impression/click events |
| `FeaturedLeader` | Leader profiles linked to article and/or magazine |
| `HomepageSection` | Configurable homepage category dispatches |
| `PartnerOrganization` | Partner strip |
| `Announcement` | Masthead announcement bar |
| `SiteConfiguration` | Singleton branding / hero / contact / social |
| `ClientEnquiry` | Contact / commercial enquiry CRM-lite |
| `ReaderPreference` | Followed categories + notification prefs |
| `UserNotification` | In-app notifications |
| `NewsletterSubscriber` | Consent + unsubscribe token (no outbound campaigns yet) |
| `SavedContent` | Bookmarks (exactly one of article/magazine) |
| `ReadingHistory` | Continue-reading + last PDF page |
| `ManagementAuditEvent` | Magazine workflow audit trail |
| `DemoSeedRecord` | Tracks demo-seeded rows for safe cleanup |

### Auth / roles (current)

- Django `User` + groups created by `setup_roles`: Content Editors, Publication Reviewers, Publication Publishers, Advertisement Managers, Client Enquiry Managers, plus manual `Subscribers` for member-only content.
- Superuser via `createsuperuser`.
- Staff `/manage/` dashboard for magazine upload → submit → review → publish.

### Public routes (current)

Home, register, contact, leaders, magazines (list/detail/reader/pdf/progress), articles, search, newsletter, account (profile, saved, preferences, notifications, enquiries), RSS `feed.xml`, ad impression/click, staff manage + advertising report.

**Gap vs master prompt:** Navigation today does not expose separate **Editions** and **Magazines** experiences, nor dedicated **Discover**, **Stories** naming, or RSS/search as first-class branded nav items matching the new IA. Magazine-wall animation currently lives on Editions-related homepage treatment; target design moves the wall to **Magazines**.

---

## 3. Target architecture

```text
THE-GLOBAL-ICON/
├── legacy-django/          # existing Django tree kept until cutover (initially: keep in place)
├── apps/
│   ├── public-web/         # React + TypeScript + Vite + Tailwind
│   ├── admin-dashboard/    # Angular + TypeScript
│   └── api/                # NestJS + TypeScript
├── packages/
│   ├── shared-types/
│   ├── shared-validation/
│   └── shared-config/
├── database/
│   ├── prisma/             # schema + migrations
│   ├── seeds/
│   └── documentation/
├── storage/
│   └── development-only/   # private PDFs + covers in local dev
└── docs/                   # ARCHITECTURE, MIGRATION, DATABASE, SECURITY, API, DEPLOYMENT
```

| Layer | Choice | Rationale |
|---|---|---|
| Public frontend | React + Vite + TypeScript + Tailwind + Framer Motion | Premium editorial UX, magazine wall, reader |
| Admin frontend | Angular + TypeScript | Separate responsibility for Admin / Super Admin |
| API | NestJS + TypeScript | Modular RBAC, Swagger, guards, file streaming |
| ORM / DB | Prisma + PostgreSQL | Typed schema, safe migrations, production-ready |
| Auth | JWT access + rotating refresh (HTTP-only cookies) | Short-lived access, revocation support |
| Files | Local private storage now; S3-compatible adapter later | Preserve private PDF model |
| Docs | OpenAPI via Nest Swagger | Required API documentation |

### Separation of duties

- **React (`public-web`)** — only public/reader experiences.
- **Angular (`admin-dashboard`)** — only Admin / Super Admin management.
- **NestJS (`api`)** — sole business logic and authorization boundary. Frontend route guards are UX only; every privileged action is enforced server-side.

### Editions vs Magazines (target IA)

| Section | Purpose | Data |
|---|---|---|
| **Editions** | Publication library of numbered/dated issues (featured, current, previous) | `EditionIssue` / mapped from current `Magazine` issues that are edition-oriented |
| **Magazines** | Immersive digital magazine showcase (wall animation, 3D carousel, flipbook) | Same underlying publications with magazine presentation metadata — **not** duplicate PDFs or duplicate DB rows for animation covers |

Cover wall animation reuses published cover image URLs already associated with magazines; it must not invent extra publication records.

---

## 4. Feature-preservation checklist

| Existing capability | Preserve? | New home |
|---|---|---|
| Public homepage + branding | Yes | React Home |
| Article list/detail + statuses + scheduled publish | Yes | Stories + API |
| Magazine list/detail/filters/pagination | Yes | Magazines + Editions split |
| Private PDF delivery + access checks | Yes | Nest PDF streaming |
| PDF.js reader + progress | Yes | React reader (flipbook + mobile scroll) |
| Leaders directory/detail | Yes | Leaders |
| Search | Yes | Global search |
| RSS feed | Yes | `/feed.xml` or API-backed feed |
| Newsletter consent/unsubscribe | Yes | API + React |
| Contact / client enquiries workflow | Yes | Contact + Admin CRM |
| Advertising placements + aggregate analytics | Yes | API + Admin |
| Saved content / reading history | Yes | Reader account APIs |
| Notifications + preferences | Yes | Account + Admin |
| Staff magazine workflow + audit | Yes | Angular Admin |
| Site configuration singleton | Yes | Settings (Super Admin) |
| Demo seed + showcase covers | Yes (dev only) | Prisma seeds |
| Django Admin | Keep until Angular parity | Then retire |
| MySQL optional backend | Migrate path → PostgreSQL | Do not drop source DB |

### Explicitly out of scope until later (still documented)

Payment/billing, DRM, AI providers, unique ad reach, outbound newsletter campaigns — same as current README “Not yet implemented,” unless delivered in Phase 7 where they fit without fake claims.

---

## 5. Security baseline (target)

- Argon2id/bcrypt password hashing
- JWT access + refresh rotation + revocation
- RBAC: `SUPER_ADMIN`, `ADMIN` (+ module permissions), `READER`
- Rate-limited login; validated uploads (PDF magic, MIME, size)
- No secrets in git; Super Admin bootstrap via env/management command only
- Unpublished PDFs never exposed via public URLs
- Audit log for privileged content actions

---

## 6. Phase gate

Phase 1 is complete when this document, `docs/MIGRATION.md`, and `docs/FEATURE_CHECKLIST.md` exist and assets/PDFs are located.  
Phase 2 begins with monorepo scaffolding beside (not replacing) the Django app.
