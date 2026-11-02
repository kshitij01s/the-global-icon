# Theme Studio Guide

**Route:** Admin → Appearance & Themes → **Festival Theme Studio** (`/theme-studio`)

## Layout

| Zone | Purpose |
|------|---------|
| Left sidebar | Dashboard, library, calendar, creator, templates, regions, assets, animations, schedules, history, published, settings |
| Center | Live website preview (desktop / tablet / mobile) |
| Right panel | Colors, effects, versions, festival list, assets |
| Top toolbar | Undo, Redo, Reset, Save Draft, Duplicate, Publish, Schedule |

## Workflow

1. **New template** or create from a library theme / festival.
2. Adjust colors and animation toggles — preview updates live.
3. **Save Draft** → persisted to PostgreSQL (`ThemeTemplate` + version).
4. **Publish** → writes/updates `ThemeDefinition` (usable by scheduler).
5. **Schedule** → assign start/end (UTC stored), timezone, country, priority.
6. When the window is active, public site resolves the festival theme automatically.

## Permissions

| Action | Permission |
|--------|------------|
| View studio | `themes.view` |
| Create / edit / publish templates | `themes.manage` (typically Super Admin) |
| Schedules | `themes.schedule` |

Backend guards enforce these; UI hiding is not sufficient.

## Calendar

Festival Calendar shows:

- Real `FestivalSchedule` rows for the selected year
- Sample windows from festival metadata (labelled **Needs verify** when lunar/unverified)
