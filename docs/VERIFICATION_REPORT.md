# Project verification report — THE GLOBAL ICON

**Date:** 2026-11-01  
**Method:** Code inspection + live HTTP checks against Nest API on `:4000`

---

## Issue A — “FastAPI migration failed”

| Finding | Detail |
|---|---|
| FastAPI in this repo? | **No.** Grep of project sources found no FastAPI/uvicorn application. |
| Actual legacy stack | **Django 5.2** at repo root (`manage.py`, `publications/`, SQLite/`db.sqlite3`). |
| Actual modern API | **NestJS + Prisma + PostgreSQL** in `apps/api`. |
| Frontend targets | React + Angular both call `http://localhost:4000/api` — **not** Django `:8000` and **not** FastAPI. |

**Status: Not applicable / completed as NestJS migration (not FastAPI).**  
No FastAPI remigration was performed. Do not re-run a FastAPI migration.

---

## Issue B — Extended Admin API stopped by usage limit

Interrupted earlier during agent work; **implementation was completed afterwards** and re-verified live:

| Endpoint | Super Admin result |
|---|---|
| `GET /api/admin/dashboard` | 200 |
| `GET /api/admin/articles` | 200 |
| `GET /api/admin/leaders` | 200 |
| `GET /api/admin/enquiries` | 200 |
| `GET /api/admin/users` | 200 |
| `GET /api/admin/settings` | 200 |
| `GET /api/admin/advertisements` (+ report) | 200 |
| `GET /api/admin/categories` | 200 |
| `GET /api/admin/magazines` | 200 |
| Admin `PATCH /api/admin/settings` | **403** (correct — Super Admin only) |
| Reader `GET /api/admin/dashboard` | **403** (correct) |

Angular admin pages were rewired to these endpoints (stories publish/unpublish, leaders, enquiries status/notes, users activate/deactivate, settings edit for Super Admin, ads list/report).

**Status: Completed and verified.**

---

## Summary table

| Task | Status | Action |
|---|---|---|
| FastAPI migration | N/A — never part of this repo; NestJS API is live | Verified; no remigration |
| Extended Admin API | Completed | Verified with live HTTP |
| Admin authentication | Working | Login `admin` / `Admin123456!` → 200 |
| Super Admin authentication | Working | Login `superadmin` / `SuperAdmin123!` → 200 |
| PostgreSQL connection | Working | Health reports `database: "up"` |
| Frontend API integration | Working (config) | `VITE_API_URL` / `environment.apiUrl` → `:4000/api` |
| React / Angular running | User terminal PATH issue | Use `scripts/use-node.ps1` then `npm run dev:web` / `dev:admin` |

---

## Errors found and addressed

1. **VS Code terminal: `npm` not recognized** — Node not on PATH. Fixed with `scripts/use-node.ps1` and documented in `docs/RUN.md`.
2. **Root `package.json` build referenced missing `@tgi/shared-types`** — script corrected earlier.
3. **Admin pages previously showed “API pending”** — wired to real admin APIs.
4. **Staff credentials unknown** — old users deleted; Super Admin + Admin recreated (see `.superadmin-local.txt`).

---

## Design updates in this pass

- Unique sticky header with brand name + tagline lockup; Advertise + About Us in nav; Sign-in CTA.
- New `/about` and `/advertise` pages (original copy, not cloned from references).
- Homepage: editorial spotlight / advertising + personalization band.
- Magazines page: wall remains Magazines-only; copy clarifies Editions vs Magazines separation.

---

## Remaining limitations

- Magazine form still uses storage keys for PDF/cover (upload API exists; UI file picker polish optional).
- Production object storage not yet switched from local `STORAGE_ROOT`.
- Broader E2E/CI pipeline not yet automated.
- Django remains on disk until formal cutover approval.
