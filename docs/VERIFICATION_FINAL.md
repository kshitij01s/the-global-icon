# Final Verification Report — THE GLOBAL ICON

Date: 2026-11-02

## Run commands

```powershell
$env:Path = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;" + $env:Path
cd "D:\Magazine Project"

npm run dev:api     # http://localhost:4000
npm run dev:web     # http://localhost:5173  (React — use this for themes)
npm run dev:admin   # http://localhost:4200
```

Database:

```powershell
cd apps/api
npx prisma migrate deploy
npx prisma db seed
```

Tests / builds:

```powershell
npm run test -w @tgi/api
npm run build -w @tgi/api
npm run build -w @tgi/public-web
npm run build -w @tgi/admin-dashboard
```

Optional API smoke: `node apps/api/scripts/verify-theme-editor.js`

## Theme priority

1. Super Admin manual override  
2. Active scheduled festival (server clock)  
3. Global default theme  
4. Reader Light / Dark / System (client, when allowed)

## Permissions

| Capability | Super Admin | Admin |
|---|---|---|
| View themes | Yes | Yes |
| Set global / override / schedule / rollback | Yes | No (unless `allowAdminGlobalChange`) |
| Edit page drafts | Yes | Yes |
| Publish pages | Yes | No |
| Site branding settings write | Yes | No |

## Environment

- Copy `.env.example` → `.env` / `apps/api/.env` with placeholders only in the example file.
- Never commit `.env`, `apps/api/.superadmin-local.txt`, or storage PDFs.

## Git (2026-11-02)

| Step | Status |
|------|--------|
| `git --version` | Pass — 2.56.0.windows.4 |
| `git init -b main` | Pass |
| Secrets excluded | Pass (`.env`, staff local file, sqlite, node_modules) |
| Files staged | Pass (~321 files) |
| Commit | Pending — need `user.name` / `user.email` |
| Remote / push | Pending — need GitHub URL |

## Live verification snapshot

Script: `apps/api/scripts/verify-theme-editor.js`

- 21 themes (LIBRARY + FESTIVAL)
- Active: `midnight-dark` / global
- CMS `GET /pages/home` → 200
- Unauthenticated admin themes → 401
- Admin global theme / publish → 403
- Admin pages list / draft edit permission → 200 / pages.edit
- Super Admin override → `festival-christmas` / `manual_override`
- Draft save 200, publish 201
- API Jest 27/27; API/React/Angular production builds pass
- Ports: API `:4000`, web `:5173`, admin `:4200` responding
