# THE GLOBAL ICON — Theme & Festival System

## Why the previous redesign seemed missing

1. **No selectable theme engine existed** — only hardcoded CSS mood classes (`mood-midnight`, `mood-ivory`, …) in React.
2. **Nothing in Admin could change appearance** — `SiteSettings` had no theme fields.
3. **Wrong stack risk** — Django on `:8000` never loads React `index.css` moods. Use React at `:5173`.
4. **Hero brand text ignored settings** — `heroTitle` / `tagline` were hardcoded (now CMS-driven via managed pages + settings fallback).

## Priority rules (highest first)

1. Super Admin **manual override**
2. Active **scheduled festival** theme (server clock, priority then start date)
3. Configured **global default** theme
4. Visitor **reader preference** (light / dark / system) — client only, when `allowReaderPreference`

## Public APIs

- `GET /api/themes/active` — resolved theme + tokens + effects
- `GET /api/themes` — library
- `GET /api/pages/:slug` — published CMS page

## Admin APIs

- `GET /api/admin/themes/overview`
- `POST /api/admin/themes/global` (themes.manage)
- `POST /api/admin/themes/global-as-admin` (when allowAdminGlobalChange)
- `POST /api/admin/themes/override`
- `PATCH /api/admin/themes/settings`
- `POST /api/admin/themes/schedules`
- `GET|PATCH|POST /api/admin/pages…`
- Announcements CRUD under `/api/admin/announcements`

## Festival effects

Lightweight CSS/DOM overlays (≤24 snowflakes). Honours `prefers-reduced-motion` and is disabled on `/read/*`.
