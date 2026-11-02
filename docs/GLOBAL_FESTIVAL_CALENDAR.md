# Global Festival Calendar

## Admin views

Theme Studio → **Festival Calendar**

- Filter by year and country
- Status labels: Draft, Scheduled, Active, Paused, Expired, Needs date verification
- Sample windows from catalog metadata for planning
- Clicking into Schedule Manager edits activation windows

## Catalog coverage (seed)

Initial `Festival` seed includes India, USA, UK, China/East Asia, Middle East, and international observances (Diwali, Holi, Christmas, Lunar New Year, Ramadan, Thanksgiving, etc.).

New countries and festivals can be added via `POST /api/admin/themes/festivals` without code changes.

## Date verification

| Basis | Policy |
|-------|--------|
| Gregorian fixed (e.g. 25 Dec) | `dateVerified: true` with source note |
| Lunar / computus / bank-holiday Monday | `dateVerified: false` until admin confirms for the year |

Do not treat sample windows as official activation dates until a `FestivalSchedule` is created and enabled.
