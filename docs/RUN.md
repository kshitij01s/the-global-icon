# Exact run commands (Windows PowerShell)

Project root: `D:\Magazine Project`

Node.js is installed at `C:\Program Files\nodejs`, but some VS Code terminals do not inherit PATH.
**Always run this first in each new terminal:**

```powershell
. "D:\Magazine Project\scripts\use-node.ps1"
```

Or one-liner:

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
```

---

## One-time setup

```powershell
cd "D:\Magazine Project"
. .\scripts\use-node.ps1
npm install
```

### Backend env

```powershell
cd "D:\Magazine Project\apps\api"
Copy-Item .env.example .env -ErrorAction SilentlyContinue
# Edit .env: DATABASE_URL, JWT secrets, SUPER_ADMIN_* as needed
```

Typical local `DATABASE_URL`:

```text
postgresql://postgres:postgres@localhost:5432/the_global_icon?schema=public
```

### Database migrate + seed

```powershell
cd "D:\Magazine Project\apps\api"
. "..\..\scripts\use-node.ps1"
npm run prisma:migrate
npm run prisma:seed
# Optional: recreate local staff accounts
node .\scripts\reset-staff-users.js
```

Ensure the five supplied PDFs exist under:

`storage/development-only/magazines/pdfs/supplied/`

---

## Daily development — three terminals

### Terminal 1 — Nest API (backend)

```powershell
cd "D:\Magazine Project"
. .\scripts\use-node.ps1
npm run dev:api
```

- API: http://localhost:4000/api  
- Health: http://localhost:4000/api/health  
- Swagger: http://localhost:4000/docs  

### Terminal 2 — React public site

```powershell
cd "D:\Magazine Project"
. .\scripts\use-node.ps1
npm run dev:web
```

- Frontend: http://localhost:5173  

### Terminal 3 — Angular admin

```powershell
cd "D:\Magazine Project"
. .\scripts\use-node.ps1
npm run dev:admin
```

- Admin login: http://localhost:4200/login  
- Super Admin and Admin use the **same login URL**; role is assigned on the account.

---

## Tests & production builds

```powershell
cd "D:\Magazine Project"
. .\scripts\use-node.ps1
npm run test -w @tgi/api
npm run build -w @tgi/api
npm run build -w @tgi/public-web
npm run build -w @tgi/admin-dashboard
```

---

## PostgreSQL check

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d the_global_icon -c "SELECT current_database();"
```

---

## Local staff credentials (development)

Written to gitignored `apps/api/.superadmin-local.txt` after staff reset:

| Role | Identifier | Password |
|---|---|---|
| Super Admin | `superadmin` or `superadmin@theglobalicon.local` | `SuperAdmin123!` |
| Admin | `admin` or `admin@theglobalicon.local` | `Admin123456!` |

Rotate before any shared or production use. Do not commit passwords.

---

## Legacy Django (optional, preserved)

Only if you need the old stack. Recreate a Python 3.12 venv first (the old 3.10 venv may be broken):

```powershell
cd "D:\Magazine Project"
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py runserver
```

Public Django site historically: http://127.0.0.1:8000/ — modern frontends talk to Nest on `:4000`, not Django.
