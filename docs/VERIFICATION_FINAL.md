# Final Verification Report — THE GLOBAL ICON

Date: 2026-11-04 (Magazines hero parity + CMS wiring + studio verify)

## Run commands

```powershell
$env:Path = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;" + $env:Path
cd "D:\Magazine Project"

npm run dev:api     # http://localhost:4000
npm run dev:web     # http://localhost:5173  (React — use this for themes)
npm run dev:admin   # http://localhost:4200
```

Database (additive — do not reset):

```powershell
cd apps/api
npx prisma migrate deploy
```

Festival catalog / templates seed on first studio or themes API call via `ensureFestivalSeeded()`.

Tests / builds:

```powershell
npm run test -w @tgi/api
npm run build -w @tgi/api
npm run build -w @tgi/public-web
npm run build -w @tgi/admin-dashboard
```

## Theme priority

1. Super Admin manual override  
2. Active scheduled **regional** festival  
3. Active scheduled **global** festival  
4. Global default theme  
5. Reader Light / Dark / System (client, when allowed)

## Festival Theme Studio

- Route: `/theme-studio`
- APIs under `/api/admin/themes/studio`, `/templates`, `/festivals`, `/calendar`, `/assets`, `/animations`
- Publish writes to existing `ThemeDefinition` table
- Scheduler test: `AppearanceSettings.schedulerTestAsOf` (clear after use)

## CMS Page Editor

Draft → Preview → Publish → Restore remains on `/pages/:slug` with DB-backed `ManagedPage` / `ManagedPageVersion`.

## GitHub

Repository: https://github.com/kshitij01s/the-global-icon  

## Verified this session

- Public: Magazines hero gold **MAGAZINES** + dense cover wall; Home CMS `sectionsVisible`; About/Advertise/Contact/Magazines CMS-driven copy.
- Admin: Festival Theme Studio login + workspace; Page Editor structured copy fields.
- Scheduler test: `schedulerTestAsOf=2026-12-24` → `festival-christmas` + snowfall effects; cleared after test.
- Builds/tests: API Jest 27/27; services on `:4000` / `:5173` / `:4200`.

## Known limitations

- Lunar festival dates require yearly admin verification (by design).
- City-level targeting is not implemented (country/region only).
- Theme Studio live preview is an in-admin frame (not a full iframe of the public site).
- Automatic scheduler is request-time resolution (no separate cron worker required).
- Bookmark/save library UI is not fully productized (homepage copy no longer claims it).
