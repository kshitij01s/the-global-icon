# THE GLOBAL ICON

**Stories That Shape Tomorrow.**

A premium digital magazine publishing platform with editorial management, magazine editions, advertising campaigns, analytics, CMS, and global theme customization.

## Features

- Public React magazine site (editions, stories, leaders, PDF reader)
- Angular Admin / Super Admin console with RBAC
- NestJS API + PostgreSQL (Prisma)
- Global theme library (21 themes) with festival scheduling
- Christmas and other festival visual treatments (effects off on `/read`)
- Webpage Page Editor (draft / publish / restore)
- Contact, newsletter, RSS, advertising enquiry workflows
- Legacy Django application preserved until cutover

## Technology stack

| Layer | Stack |
|-------|--------|
| Public web | React, TypeScript, Vite, Tailwind, Framer Motion |
| Admin | Angular 19 |
| API | NestJS, Prisma, PostgreSQL, JWT + refresh cookies |
| Legacy | Django 5.2 (repo root — preserved) |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).  
Modern apps live under `apps/`. Dual-stack notes: [README-MODERN.md](README-MODERN.md).

## Local development (modern stack)

**Requirements:** Node.js 20+, PostgreSQL 16+

```powershell
$env:Path = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;" + $env:Path
cd "D:\Magazine Project"

Copy-Item apps\api\.env.example apps\api\.env
# Edit apps/api/.env — set DATABASE_URL and JWT secrets (placeholders only in the example)

npm install
cd apps\api
npx prisma migrate deploy
npx prisma db seed
cd ..\..

npm run dev:api     # http://localhost:4000  (Swagger: /docs)
npm run dev:web     # http://localhost:5173
npm run dev:admin   # http://localhost:4200
```

### Environment variables (API)

Configure privately in `apps/api/.env` (never commit):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Auth signing secrets |
| `CORS_ORIGINS` | Allowed front-end origins |
| `STORAGE_ROOT` | Local magazine file storage |
| `SUPER_ADMIN_PASSWORD` | Optional bootstrap (omit in shared envs) |

Templates: [apps/api/.env.example](apps/api/.env.example), root [.env.example](.env.example) (Django).

### Build & test

```powershell
npm run test -w @tgi/api
npm run build -w @tgi/api
npm run build -w @tgi/public-web
npm run build -w @tgi/admin-dashboard
```

Theme/page smoke (API must be running):

```powershell
node apps/api/scripts/verify-theme-editor.js
```

## Documentation

| Doc | Topic |
|-----|--------|
| [docs/THEME_SYSTEM.md](docs/THEME_SYSTEM.md) | Theme priority & APIs |
| [docs/VERIFICATION_FINAL.md](docs/VERIFICATION_FINAL.md) | Latest verification |
| [docs/API.md](docs/API.md) | API overview |
| [docs/SECURITY.md](docs/SECURITY.md) | Security notes |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment guidance |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guide |

## Screenshots

Add product screenshots under `docs/screenshots/` when available. Existing root PNGs are reference captures from development.

## Security notes

- Do not commit `.env`, `apps/api/.superadmin-local.txt`, or private PDFs under `storage/`.
- Rotate any credentials that ever appear in chat, screenshots, or shared machines.
- Prefer the React site (`:5173`) for theme verification — not the legacy Django server.

## License

MIT — see [LICENSE](LICENSE).
