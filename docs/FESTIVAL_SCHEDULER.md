# Festival Scheduler

## Creating a schedule

Admin API: `POST /api/admin/themes/schedules`

Fields:

- `eventKey`, `name`, `themeSlug`
- `startsAt` / `endsAt` (ISO; stored UTC)
- `timezone` (IANA, e.g. `Asia/Kolkata`) — documented intent for regional windows
- `countryCode` / `regionCode` — optional targeting
- `festivalId` — optional catalog link
- `priority` — higher wins among eligible schedules
- `status`: `DRAFT` | `SCHEDULED` | `ACTIVE` | `PAUSED` | `EXPIRED` | `CANCELLED`
- `enabled` — must be true for activation
- `restoreThemeSlug` — preferred restore after end (global theme used if no next festival)

## Activation

On each `GET /api/themes/active` (and admin overview):

1. Evaluate `schedulerTestAsOf` or wall clock (UTC).
2. Load enabled schedules with status `SCHEDULED` or `ACTIVE` whose window contains now.
3. Score by region match → country match → global.
4. Skip country-locked schedules that do not match the visitor’s preferred country.
5. Highest score, then highest priority, then latest `startsAt`.
6. Optionally mark winning schedule `ACTIVE`.

## Deactivation

When no schedule matches, resolution falls back to the global theme. History is written on schedule upserts and status changes (`ThemeHistory`).

## Conflict resolution

- Prefer more specific region over country over global.
- Equal specificity: higher `priority` wins.
- Super Admin override always wins while active.
- Super Admin can pause/cancel competing schedules.

## Test mode

Set `schedulerTestAsOf` via Theme Studio → Theme Settings. Clear after tests. Does not force-publish; only changes resolution time for active-theme reads.
