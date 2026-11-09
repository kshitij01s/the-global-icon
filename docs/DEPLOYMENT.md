# Deployment — dual stack

Until cutover is verified, the repository contains:

1. **Legacy Django** app at the repository root (SQLite/MySQL).
2. **Modern stack** under `apps/` (React public, Angular admin, Nest API, PostgreSQL).

Do **not** delete Django until PostgreSQL migration verification and acceptance criteria pass.

## Modern stack (recommended path)

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Copy supplied demo PDFs into `storage/development-only/magazines/pdfs/supplied/` if missing

### Configure

```powershell
cd apps/api
Copy-Item .env.example .env
# Set DATABASE_URL, JWT secrets, SUPER_ADMIN_PASSWORD
npm install
npm run prisma:migrate
npm run prisma:seed
```

Optional content import from legacy SQLite (dry-run first):

```powershell
npx ts-node scripts/migrate-from-sqlite.ts
npx ts-node scripts/migrate-from-sqlite.ts --apply
```

### Run locally

```powershell
# from repo root
npm run dev:api      # :4000
npm run dev:web      # :5173 React
npm run dev:admin    # :4200 Angular
```

### Production checklist

- [ ] Strong secrets; `NODE_ENV=production` (JWT secrets ≥ 32 chars, not `change-me-*`)
- [ ] Managed PostgreSQL with backups
- [ ] Object storage / durable `STORAGE_ROOT` for private PDFs
- [ ] TLS termination + secure cookies (`secure` flag when `NODE_ENV=production`)
- [ ] Restrict `CORS_ORIGINS` to real HTTPS public + admin origins (required in production)
- [ ] Rotate bootstrap Super Admin password; unset bootstrap env after first seed if desired
- [ ] Swagger `/docs` is auto-disabled in production
- [ ] Content protection enabled on public web (see `docs/CONTENT_PROTECTION.md`)
- [ ] Run `npm run predeploy:check` (tests + all builds)
- [ ] Verify magazine PDFs open through authorized API only
- [ ] Keep Django offline but backed up for one release cycle

### Pre-deploy command

```powershell
cd "D:\Magazine Project"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\scripts\use-node.ps1
npm run predeploy:check
```

### Builds

```powershell
npm run build -w @tgi/api
npm run build -w @tgi/public-web
npm run build -w @tgi/admin-dashboard
```

## Legacy Django (still preserved)

See historical sections below and `README.md` for `manage.py` workflows. Recreate `.venv` with a working Python 3.12+ interpreter before running Django locally — the previous Python 3.10 venv path may be broken.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Backup / rollback

1. Backup PostgreSQL (`pg_dump`) and `storage/`.
2. Keep `db.sqlite3` / MySQL dumps untouched.
3. Rollback = restore DB + storage and redeploy previous artifact; Django remains a fallback until retired.
