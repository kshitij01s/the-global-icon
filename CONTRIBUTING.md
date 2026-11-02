# Contributing to THE GLOBAL ICON

Thank you for contributing. This repository contains a dual stack: a preserved Django legacy app at the root and the active modern stack under `apps/`.

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (modern API)
- Optional: Python 3.10+ for the legacy Django app

## Development workflow

1. Fork or clone the repository.
2. Copy environment templates:
   - `apps/api/.env.example` → `apps/api/.env`
   - Root `.env.example` → `.env` (legacy Django only)
3. Install and migrate:

```powershell
npm install
cd apps/api
npx prisma migrate deploy
npx prisma db seed
cd ../..
```

4. Run services in separate terminals:

```powershell
npm run dev:api
npm run dev:web
npm run dev:admin
```

5. Prefer small, focused pull requests with a clear description of intent.
6. Do not commit secrets, `.env` files, or `apps/api/.superadmin-local.txt`.
7. Keep demo content clearly labelled (`DEMO SEED` / `isDemo`).

## Checks before opening a PR

```powershell
npm run test -w @tgi/api
npm run build -w @tgi/api
npm run build -w @tgi/public-web
npm run build -w @tgi/admin-dashboard
```

## Code style

- Match existing TypeScript, NestJS, React, and Angular patterns in `apps/`.
- Prefer minimal diffs; avoid unrelated refactors.
- Document API and theme behaviour in `docs/` when behaviour changes.

## Security

Never paste passwords, tokens, or production connection strings into issues, commits, or documentation.
