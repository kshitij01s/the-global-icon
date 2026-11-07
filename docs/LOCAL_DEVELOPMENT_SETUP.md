# Local Development Setup

## Prerequisites

- Node.js **20+** (`node -v`)
- npm (bundled with Node)
- PostgreSQL 16+ with a database matching `DATABASE_URL` in `apps/api/.env`
- Windows PowerShell recommended for `scripts/use-node.ps1`

## Node session helper

```powershell
cd "D:\Magazine Project"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\scripts\use-node.ps1
```

This prepends the standard Node install path for the current session only.

## Install dependencies

```powershell
npm install
```

## Environment

- Copy `apps/api/.env.example` → `apps/api/.env` and set `DATABASE_URL`, JWT secrets, `CORS_ORIGINS` (include `http://localhost:5173` and `http://localhost:4200`).
- Optional: `apps/public-web/.env` for `VITE_API_URL` / `VITE_ADMIN_URL`.
- **Never commit** `.env` files or credentials.

## Database

```powershell
npm run db:migrate
npm run db:seed
```

Additive migrations only. Do not reset production data.

## Start everything

```powershell
npm run dev
```

Starts:

| Label | App | URL |
|-------|-----|-----|
| API | NestJS | http://localhost:4000 |
| WEB | React | http://localhost:5173 |
| ADMIN | Angular | http://localhost:4200 |

Individual commands remain: `npm run dev:api`, `npm run dev:web`, `npm run dev:admin`.

## Stop all services

Ctrl+C in the `npm run dev` terminal. The `-k` flag stops remaining children.

## Staff accounts

```powershell
cd "D:\Magazine Project\apps\api"
node scripts/reset-staff-users.js
```

Credentials write to a **gitignored** local file. Use only on your machine.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `node` / `npm` not found | Run `.\scripts\use-node.ps1` or install Node LTS |
| Port already in use | Stop prior `dev:api` / Vite / `ng serve`; keep ports 4000 / 5173 / 4200 |
| API fails DB connect | Verify PostgreSQL and `DATABASE_URL` |
| Admin 401 / empty nav | Sign in with staff account; refresh cookie via login |
| CORS errors | Ensure both front-end origins are in `CORS_ORIGINS` |
| One service crashes under `npm run dev` | Scroll for the colored label (`API`/`WEB`/`ADMIN`); fix that package; Ctrl+C and restart |

## Smoke checks

- Public Sign In → Super Admin → Admin console loads
- Admin Page Editor publish → React homepage updates
- RSS: http://localhost:4000/api/rss/articles.xml
- Magazines publish → appears publicly
- API Inbox simulate (dev) → badge updates
- Theme: Light / Dark / System in public header
