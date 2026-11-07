# API Inbox — API Reference

Base path prefix: `/api`

All admin routes require Bearer JWT and permissions as noted.

## Alerts summary

`GET /admin/api-inbox/alerts`  
Permission: `api_inbox.view`

```json
{
  "openCount": 8,
  "criticalCount": 2,
  "warningCount": 5,
  "latest": [{ "id": "…", "title": "…", "severity": "CRITICAL", "status": "OPEN", "occurrenceCount": 3, "lastSeenAt": "…" }]
}
```

## List

`GET /admin/api-inbox`  
Query: `status`, `severity`, `category`, `source`, `search`, `entityType`, `dateFrom`, `dateTo`, `page`, `limit`  
Permission: `api_inbox.view`

Returns `{ items, total, page, limit, pageCount }`.

## Detail

`GET /admin/api-inbox/:id`  
Permission: `api_inbox.view`

## Update (acknowledge / resolve / reopen / notes)

`PATCH /admin/api-inbox/:id`  
Permission: `api_inbox.manage`  
Body: `{ "status"?: "ACKNOWLEDGED"|"RESOLVED"|"OPEN", "adminNotes"?: string }`

## Stats

- `GET /admin/api-inbox/stats/categories`
- `GET /admin/api-inbox/stats/sources`

## Development simulator

`POST /dev/api-inbox/simulate-failure`  
Permission: `api_inbox.manage`  
Only when `NODE_ENV` is not `production`.

Body: `{ "scenario"?: "storage"|"pdf"|"rss"|"campaign"|"festival"|"html_upstream" }`

Returns `{ ok, scenario, report, customerMessage }`.
