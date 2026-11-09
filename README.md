# THE GLOBAL ICON

**Stories That Shape Tomorrow.**

A premium digital magazine publishing platform with editorial management, magazine editions, advertising campaigns, analytics, CMS, and global theme customization.

## Features

- Public React magazine site (editions, stories, leaders, PDF reader)
- Angular Admin / Super Admin console with RBAC
- NestJS API + PostgreSQL (Prisma)
- Global theme library (30+ built-in themes) with festival scheduling
- **Festival Theme Studio** (Figma-style admin editor): templates, calendar, assets, animations
- Worldwide festival catalog with regional schedules and visitor region preference
- Festival visual treatments (effects off on `/read`; reduced-motion safe)
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

**Requirements:** Node.js 20+ (see `engines` in root `package.json`), PostgreSQL 16+, PowerShell on Windows.

### One-command startup (recommended)

```powershell
cd "D:\Magazine Project"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\scripts\use-node.ps1
npm install
# First time only — copy env, migrate, seed (never commit secrets):
# Copy-Item apps\api\.env.example apps\api\.env
# npm run db:migrate
# npm run db:seed
npm run dev
```

`npm run dev` runs API, React, and Angular together via `concurrently` (`-k` kills all on Ctrl+C). Labels: **API**, **WEB**, **ADMIN**.

| Service | URL |
|---------|-----|
| Backend API | http://localhost:4000 (Swagger `/docs`) |
| Public website | http://localhost:5173 |
| Admin dashboard | http://localhost:4200 |

### Individual services (still supported)

```powershell
npm run dev:api     # NestJS
npm run dev:web     # React
npm run dev:admin   # Angular
```

### Stop

Press **Ctrl+C** in the terminal running `npm run dev`. Concurrently stops child processes (`-k`).

Staff login from the public site redirects Admin / Super Admin to the Angular console. Shared auth: [docs/AUTHENTICATION_AND_ROLE_ACCESS.md](docs/AUTHENTICATION_AND_ROLE_ACCESS.md) · [docs/LOCAL_DEVELOPMENT_SETUP.md](docs/LOCAL_DEVELOPMENT_SETUP.md).

Reset local staff accounts (writes gitignored credentials file):

```powershell
cd apps\api
node scripts\reset-staff-users.js
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

### Festival Theme Studio docs

- [docs/GLOBAL_FESTIVAL_THEME_IMPLEMENTATION_PLAN.md](docs/GLOBAL_FESTIVAL_THEME_IMPLEMENTATION_PLAN.md)
- [docs/FESTIVAL_THEME_SYSTEM.md](docs/FESTIVAL_THEME_SYSTEM.md)
- [docs/THEME_STUDIO_GUIDE.md](docs/THEME_STUDIO_GUIDE.md)
- [docs/FESTIVAL_SCHEDULER.md](docs/FESTIVAL_SCHEDULER.md)
- [docs/GLOBAL_FESTIVAL_CALENDAR.md](docs/GLOBAL_FESTIVAL_CALENDAR.md)

Admin: `http://localhost:4200/theme-studio`

## Documentation

| Doc | Topic |
|-----|--------|
| [docs/CURSOR_FRONTEND_AND_GATEWAY_SETUP.md](docs/CURSOR_FRONTEND_AND_GATEWAY_SETUP.md) | Cursor UI/UX skill, motion/3D lab, Free LLM gateway notes |
| [docs/LOCAL_DEVELOPMENT_SETUP.md](docs/LOCAL_DEVELOPMENT_SETUP.md) | Local env & troubleshooting |
| [docs/PROJECT_WORKFLOW_AUDIT.md](docs/PROJECT_WORKFLOW_AUDIT.md) | Module audit |
| [docs/DASHBOARD_STRUCTURE.md](docs/DASHBOARD_STRUCTURE.md) | Admin nav structure |
| [docs/MODULE_INTEGRATION_MATRIX.md](docs/MODULE_INTEGRATION_MATRIX.md) | Integration status matrix |
| [docs/BUSINESS_WORKFLOWS.md](docs/BUSINESS_WORKFLOWS.md) | End-to-end workflows |
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
