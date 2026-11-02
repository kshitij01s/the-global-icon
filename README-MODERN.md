# THE GLOBAL ICON — Modern stack

**Brand:** THE GLOBAL ICON · *Stories That Shape Tomorrow.*

This repository now contains a dual architecture:

| Layer | Location | Stack |
|---|---|---|
| Legacy (preserved) | repo root | Django 5.2 + SQLite/MySQL |
| Public website | `apps/public-web` | React + TypeScript + Vite + Tailwind |
| Admin dashboard | `apps/admin-dashboard` | Angular + TypeScript |
| API | `apps/api` | NestJS + Prisma + PostgreSQL |

Django is **not** deleted. Cut over only after migration verification.

## Documentation

- [Architecture & audit](docs/ARCHITECTURE.md)
- [Migration plan](docs/MIGRATION.md)
- [Feature checklist](docs/FEATURE_CHECKLIST.md)
- [Supplied PDFs](docs/SUPPLIED_PDFS.md)
- [Database](docs/DATABASE.md)
- [API](docs/API.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)

## Quick start (modern)

1. Ensure PostgreSQL is running and Node 20+ is installed.
2. Copy `apps/api/.env.example` → `apps/api/.env` and set `DATABASE_URL` + JWT secrets.
3. Optionally set `SUPER_ADMIN_PASSWORD`, then seed.
4. Place the five supplied PDFs under `storage/development-only/magazines/pdfs/supplied/` (see `docs/SUPPLIED_PDFS.md`).
5. From repo root:

```powershell
npm install
cd apps/api
npm run prisma:migrate
npm run prisma:seed
cd ../..
npm run dev:api
npm run dev:web
npm run dev:admin
```

- Public site: http://localhost:5173  
- Admin: http://localhost:4200  
- API / Swagger: http://localhost:4000/docs  

Super Admin credentials (if seeded) are written only to the gitignored file `apps/api/.superadmin-local.txt` when generated locally — rotate before sharing.

## Current delivery status

**Done / working**

- Phase 1 audit + docs
- Nest API with JWT/RBAC, magazines/editions/articles/leaders/search/contact/newsletter/RSS
- PostgreSQL schema + seed of 5 supplied demo PDFs (covers + private storage keys)
- SQLite content import path for articles/leaders/categories (applied in local dev)
- React public site: Home, Editions, Magazines (wall + carousel + PDF.js reader), Stories, Leaders, Discover, Contact, Search, Sign in
- Angular admin: login, dashboard stats, magazine/edition management; additional modules wired to expanded admin APIs

**Still open (next iterations)**

- Full Angular forms for every new admin endpoint (articles/leaders/enquiries/users/settings/uploads)
- Complete advertising analytics + scheduled publishing UI polish
- Production object-storage adapter
- Broader automated E2E suite + CI
- Formal Django retirement after acceptance sign-off
