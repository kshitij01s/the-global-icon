# API Inbox — Operations Guide

## Who can use it

- **Admin / Super Admin** (and any role granted `api_inbox.view` / `api_inbox.manage`).
- Public users and readers cannot access inbox APIs or the Angular page.

## Daily workflow

1. Open **API Inbox** from the Admin sidebar (badge shows open count; red when criticals exist).
2. Or click the dashboard strip: “N API issues require attention”.
3. Filter by Open / Critical / category / search.
4. Open an incident drawer:
   - Read technical details (operators only).
   - Confirm the customer-safe message.
   - Add notes, **Acknowledge**, then **Resolve** when fixed.
5. If the same failure returns after resolution, a **new** OPEN incident appears; history stays intact.

## Severity meanings

| Severity | Meaning |
|----------|---------|
| CRITICAL | Outage-class: storage, DB, payment, scheduler, credential failures |
| WARNING | Recoverable timeouts, sync, analytics, email delivery |
| INFO | Non-critical notices |

## What not to expect

- Incorrect passwords are **not** logged as operational incidents.
- Validation / 401 / 403 / 404 noise is filtered.
- Customer APIs never receive stack traces, HTML upstream bodies, or secrets.

## Development simulation

On a local API (`NODE_ENV≠production`), use **Simulate storage** on the API Inbox page or:

```http
POST /api/dev/api-inbox/simulate-failure
Authorization: Bearer <admin-token>
{ "scenario": "storage" }
```

## Notifications

Critical incidents record `emailSentAt` with a 30-minute cooldown per fingerprint. Wire a mail provider later by extending `ApiInboxService.maybeNotify` — do not create a second notification stack.
