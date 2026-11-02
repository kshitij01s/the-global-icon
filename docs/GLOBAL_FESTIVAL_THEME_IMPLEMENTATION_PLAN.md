# Global Festival Theme Implementation Plan

Date: 2026-11-02 · Project: THE GLOBAL ICON

## 1. Existing functionality (verified in source)

| Area | Status |
|------|--------|
| Design-token themes via CSS variables | Working (`ThemeDefinition.tokens`) |
| 21 built-in library + festival themes | Working (`theme-catalog.ts` + DB seed) |
| Active theme resolution API | Working `GET /api/themes/active` |
| Priority: override → festival → global → reader | Implemented |
| FestivalSchedule + Christmas/NY seeds | Working |
| FestivalEffects (snow, lights, etc.) | Working; off on `/read` |
| Angular Appearance & Themes page | Working but basic form UI |
| CMS ManagedPage draft/publish/restore | Working |
| GitHub `kshitij01s/the-global-icon` | Exists; commit `0b60d94` |

## 2. Missing functionality (this delivery)

1. Figma-style **Festival Theme Studio** workspace (multi-panel editor).
2. Structured **Festival catalog** by country/region (not only theme slugs).
3. **Theme templates** with draft/publish/duplicate/version history.
4. **Asset library** metadata + assignment to festivals.
5. **Animation presets** library with intensity controls in admin.
6. Visual **festival calendar** dashboard.
7. Regional targeting fields on schedules (`countryCode`, `regionCode`).
8. Visitor **preferred region** selection (no mandatory geolocation).
9. Controlled **scheduler test mode** (Super Admin only; never auto-publishes to public unless activated).
10. Richer festival visual packs (Diwali, Holi, Eid, Halloween, Lunar NY, etc.) as templates.

## 3. Broken / gaps

- API was down during last inspection; restart required for E2E.
- Manual override of festival themes previously skipped effects (fixed earlier; re-verify).
- Themes admin is list/form only — not a studio.
- No country-level festival metadata entity.
- Movable lunar dates are not auto-computed — admin verification required (by design).

## 4–8. Requirements (summary)

- **Frontend redesign:** studio layout; calendar; preserve public editorial moods + festival overlays.
- **Backend:** extend Prisma; studio CRUD APIs; festival catalog; assets; schedule enhancements.
- **DB:** additive migration — no reset.
- **Design:** original illustrations via CSS/SVG; no unlicensed stock.
- **Testing:** Jest, builds, API smoke, browser checks.
- **Deploy:** commit + push to existing GitHub `main`.

## 9. Architecture decision

**Extend the existing theme engine** (`ThemeDefinition` + `AppearanceSettings` + `FestivalSchedule`). Do **not** create a second parallel engine.

New tables relate to `ThemeDefinition.slug` as the rendered theme.

## 10. Phased delivery in this session

1. Plan doc (this file).
2. Schema + migration + seed festival catalog.
3. Studio APIs + calendar/upcoming endpoints.
4. Angular Theme Studio + calendar UI.
5. Public region preference + expanded effects.
6. Docs, tests, GitHub push.
