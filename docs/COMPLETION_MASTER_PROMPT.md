# THE GLOBAL ICON — Master Prompt Completion Notes

Date: 2026-11-01

## Decisions

### RSS — **kept and verified**
- Endpoint: `GET /api/rss/articles.xml`
- Returns valid RSS 2.0 with `application/rss+xml`
- Includes published stories with titles, descriptions, authors, dates, permanent URLs
- Header + footer links point at `RSS_URL` (same endpoint)
- **Not removed** — it works and is useful for subscribers/readers

### 2025 archive
- Existing real magazines were all dated **2026**; none reclassified without metadata
- Added **4 clearly labelled `DEMO SEED` magazines** (`isDemo=true`) with 2025 publication dates via `apps/api/scripts/seed-2025-collection.js`
- Magazines list API now accepts `year` and returns `facets.years` + `facets.categories`

### Creative priorities (implemented vs recommended)

**Implemented now**
- Homepage “Turn the pages of the moment”
- Magazines mega-nav + exhibition page + 2025 Collection
- Stories mega-nav + demo editorial seeds + reading time / share
- Admin magazine file upload workflow + sidebar regrouping
- Advertise demo campaigns (no fake metrics)
- Theme moods: midnight / navy / charcoal / ivory / paper by section

**Recommended next (high value, not blindly shipped)**
1. **Magazine of the Month** — staff-flagged spotlight on Magazines + homepage
2. **Behind the Cover** — short editorial note linked to a magazine
3. **Editorial Control Centre** — schedule/approve queue on existing reviewStatus
4. **Bookmarks for stories** — wire existing `SavedContent` model to public UI
5. **Global Editorial Map** — only if reliable region metadata is maintained

---

## Files / modules changed (high level)

| Area | Paths |
|------|--------|
| API year filter | `apps/api/src/magazines/dto.ts`, `magazines.service.ts` |
| Seeds | `apps/api/scripts/seed-2025-collection.js`, `seed-demo-stories.js` |
| Homepage | `apps/public-web/src/pages/Home.tsx` |
| Magazines | `apps/public-web/src/pages/Magazines.tsx` |
| Stories | `apps/public-web/src/pages/Stories.tsx` |
| Nav / theme | `Layout.tsx`, `styles/index.css`, `lib/api.ts` |
| Advertise | `apps/public-web/src/pages/Advertise.tsx` |
| Admin | `magazine-form.component.ts`, `admin-api.service.ts`, `shell.component.ts` |

---

## How to run

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
cd "d:\Magazine Project"

# Terminal 1 — API (PostgreSQL must be running)
npm run dev:api

# Terminal 2 — public site
npm run dev:web

# Terminal 3 — admin
npm run dev:admin
```

Optional re-seed (idempotent):

```powershell
cd apps/api
node scripts/seed-2025-collection.js
node scripts/seed-demo-stories.js
```

Staff (local): see `apps/api/.superadmin-local.txt`  
Typical: `superadmin` / `SuperAdmin123!` and `admin` / `Admin123456!`

URLs (default):
- Public: http://localhost:5173
- Admin: http://localhost:4200
- API: http://localhost:4000/api/health
- RSS: http://localhost:4000/api/rss/articles.xml

---

## Test notes

- Magazines `?year=2025` returns DEMO SEED titles; facets include 2025 and 2026
- RSS returns 200 + RSS content-type
- Admin upload endpoints exist: `POST /admin/uploads/magazine-pdf` and `magazine-cover`
- Demo stories seeded with `DEMO:` titles and DEMO Editorial Desk author
- No destructive DB reset; demo magazines use `isDemo=true` for clean removal later

## Remaining issues

- Bookmark UI for signed-in users not fully wired to `SavedContent` yet
- Trending stories require real engagement aggregation (not fabricated)
- Some admin sidebar items from the full wishlist (media library, backup UI) await dedicated APIs — only working routes were linked
- Angular admin still needs a logged-in session to exercise upload end-to-end in browser
