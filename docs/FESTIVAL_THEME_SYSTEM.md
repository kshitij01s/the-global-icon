# Festival Theme System

THE GLOBAL ICON extends the **existing** theme engine (`ThemeDefinition` + `AppearanceSettings` + `FestivalSchedule`). There is no second engine.

## Architecture

```
Visitor → GET /api/themes/active?country=IN
       → ThemesService.resolveActive()
       → Priority cascade
       → CSS variables + FestivalEffects
```

## Priority (highest first)

1. Super Admin manual override (`manualOverrideSlug`)
2. Active scheduled **regional** festival (country/region match)
3. Active scheduled **global** festival (no country lock)
4. Global site theme (`globalThemeSlug`)
5. Reader Light/Dark/System preference (client, when allowed)

## Design tokens

Stored as JSON on `ThemeDefinition.tokens` / `ThemeTemplate.tokens`, rendered as CSS custom properties (`--color-midnight`, `--color-gold`, …).

## Festival catalog

`Festival` rows describe worldwide observances with:

- Country / region / continent / cultural category
- Calendar basis: `GREGORIAN` | `LUNAR` | `HYBRID`
- `dateVerified` — lunar/movable dates must be verified by admins each year
- `dateSource` — official or recognized source note
- Sample month/day windows for calendar planning (not automatic activation)

## Theme Studio templates

Admins edit `ThemeTemplate` drafts (tokens, effects, layout). **Publish** upserts a `ThemeDefinition` and records a `ThemeTemplateVersion`.

## Effects / animations

`ThemeEffects` JSON drives `FestivalEffects` on the public site. Presets live in `AnimationPreset`. Respects `prefers-reduced-motion` and is disabled on PDF `/read` routes.

## Scheduler test mode

`AppearanceSettings.schedulerTestAsOf` (Super Admin) makes `resolveActive` use a simulated instant. It does **not** auto-publish a theme to visitors; clear it after testing.

## Data sources & licensing

Festival dates prefer government / recognized cultural calendars. Movable dates are **not** invented as confirmed. Decorative assets use original CSS/SVG motifs (`css:*` keys) — no unlicensed stock imagery.
