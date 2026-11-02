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

- [ ] Strong secrets; `NODE_ENV=production`
- [ ] Managed PostgreSQL with backups
- [ ] Object storage adapter for private PDFs (replace local `STORAGE_ROOT`)
- [ ] TLS termination + secure cookies
- [ ] Restrict CORS to real origins
- [ ] Rotate bootstrap Super Admin password
- [ ] Run API + web + admin builds in CI
- [ ] Verify five demo PDFs open through authorized API
- [ ] Keep Django offline but backed up for one release cycle

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
