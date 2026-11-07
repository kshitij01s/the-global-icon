# Verification — Admin API Inbox

**Date:** 2026-11-07  
**Feature:** Admin API Inbox (Integration Monitoring & Operations Error Management)

## Checklist

| Criterion | Status |
|-----------|--------|
| Prisma `ApiInboxItem` + additive migration | Done |
| Nest module, report/dedupe/fingerprint | Done |
| Admin list/alerts/detail/patch APIs + RBAC | Done |
| DEV simulate endpoint (non-production) | Done |
| Angular page, drawer, filters, actions | Done |
| Sidebar badge + dashboard strip + 45s poll | Done |
| Wired uploads, publish, pages, RSS, themes, ads | Done |
| Global unexpected-error filter (no double-count) | Done |
| Unit tests for normalize/fingerprint/classify | Done |
| Permissions seeded (`api_inbox.view` / `manage`) | Done |
| Existing features preserved (additive only) | Done |
| Docs (`API_INBOX_*`) | Done |

## Acceptance tests (manual / API)

1. **First failure** — `simulate-failure` storage → one OPEN, `occurrenceCount=1`.
2. **Duplicate** — same scenario again → same row, count=2, `lastSeenAt` updates.
3. **Acknowledge** — PATCH status ACKNOWLEDGED → timestamps + actor.
4. **Resolve** — PATCH RESOLVED with notes.
5. **After resolve** — simulate again → new OPEN; prior RESOLVED preserved.
6. **Customer security** — `html_upstream` scenario → technical redacted in inbox; response customer-safe.
7. **Permissions** — unauthenticated → 401; reader → 403; Admin/Super Admin → OK.
8. **Badges** — open/critical counts update; resolved no longer counted open.

## Known limitations

- Operational email is logged + cooldown-stamped until a mail provider is configured.
- Occurrence “history” is count-based (no separate occurrence child table).
- Alert freshness is polling-based (45s), not WebSocket.
