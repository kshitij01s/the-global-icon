# API Inbox — Implementation

**Module:** Admin API Inbox  
**Subtitle:** Integration Monitoring & Operations Error Management  
**Project:** THE GLOBAL ICON

## Purpose

Capture operational backend / integration failures in PostgreSQL, deduplicate by fingerprint, expose them to Admin / Super Admin operators, and keep customer-facing API responses free of technical detail.

## Data model

Prisma model `ApiInboxItem` with enums `ApiInboxSeverity` (`INFO` | `WARNING` | `CRITICAL`) and `ApiInboxStatus` (`OPEN` | `ACKNOWLEDGED` | `RESOLVED`).

Key fields: `category`, `source`, `title`, `customerMessage`, `technicalError`, `fingerprint`, `occurrenceCount`, `lastSeenAt`, optional `userId` / `entityType` / `entityId`, JSON `metadata`, acknowledgement / resolution audit fields, `emailSentAt`.

Migration: `apps/api/prisma/migrations/20261107120000_api_inbox`.

## Backend module

`apps/api/src/api-inbox/`

- `ApiInboxService.report()` — normalize, classify, fingerprint, dedupe OPEN/ACKNOWLEDGED, create new OPEN after RESOLVED recurrence.
- Admin controller under `GET|PATCH /api/admin/api-inbox…`
- DEV simulator `POST /api/dev/api-inbox/simulate-failure` (disabled in production).
- Global exception filter reports unexpected non-HttpException / 500 errors without duplicating service-level reports.

Permissions: `api_inbox.view`, `api_inbox.manage` (Admin + Super Admin via role seed).

## Deduplication

SHA-256 fingerprint of `category|source|normalizedError|entityType|entityId`. Concurrent reports use a transaction that finds an active row first. Resolved history is never mutated; a new OPEN incident is created on recurrence.

## Severity

Configurable keyword heuristics in `api-inbox.classifier.ts`. Explicit severity from internal callers overrides automatic classification. Ordinary auth mistakes and validation noise are suppressed.

## Customer-safe responses

Integration catch blocks call `reportSafe()` then throw `ServiceUnavailableException` with `customerMessage`. Technical HTML, stacks, and secrets are never returned to end users.

## Real failure wiring

| Area | Integration point |
|------|-------------------|
| Magazine PDF / cover upload | `admin/uploads.ts` |
| Magazine publish | `admin.service.ts` `publishMagazine` |
| CMS page publish | `pages.admin.ts` |
| RSS feed | `rss.module.ts` `articlesFeed` |
| Festival theme resolve | `themes.service.ts` `resolveActive` |
| Campaign analytics | `advertising.ts` `report` |
| Unexpected 500s | `ApiInboxExceptionFilter` |

## Angular Admin

- Route `/api-inbox` with summary cards, filters, table, detail drawer.
- Sidebar badge + dashboard ops strip via `ApiInboxAlertsService` (45s poll).
- Acknowledge / Resolve / Reopen / notes for `api_inbox.manage`.

## Notifications

No separate mail provider exists in-repo. Critical (and optional WARNING via `API_INBOX_EMAIL_WARNINGS=true`) events log an operator notify line and set `emailSentAt` with a 30-minute fingerprint cooldown.

## Testing

Unit: `apps/api/src/api-inbox/api-inbox.util.spec.ts` (normalize, fingerprint, classify, customer messages).
