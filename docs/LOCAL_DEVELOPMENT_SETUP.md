# Local Development Setup

## Services

| App | URL | Command |
|-----|-----|---------|
| API | http://localhost:4000/api | `npm run dev:api` |
| Public (React) | http://localhost:5173 | `npm run dev:web` |
| Admin (Angular) | http://localhost:4200 | `npm run dev:admin` |

```powershell
$env:Path = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;" + $env:Path
cd "D:\Magazine Project"
npm run dev:api
# new terminal
npm run dev:web
# new terminal
npm run dev:admin
```

## Environment

- `apps/api/.env` — `DATABASE_URL`, JWT secrets, `CORS_ORIGINS=http://localhost:5173,http://localhost:4200`
- `apps/public-web/.env` (optional) — `VITE_API_URL`, `VITE_ADMIN_URL`
- Copy from each package’s `.env.example`

## Staff accounts

```powershell
cd "D:\Magazine Project\apps\api"
node scripts/reset-staff-users.js
```

Credentials are written to `apps/api/.superadmin-local.txt` (gitignored). Use those values only on your machine.

## Smoke checks

- Public Sign In → Super Admin → Admin console loads
- Admin Page Editor publish → React homepage updates
- RSS: http://localhost:4000/api/rss/articles.xml
- Theme: Light / Dark / System in header
