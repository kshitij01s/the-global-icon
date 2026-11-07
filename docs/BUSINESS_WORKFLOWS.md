# Business Workflows — THE GLOBAL ICON

Workflows describe **supported** paths. Steps without platform support are marked explicitly.

## 1. Magazine publication — Working

1. Admin opens **Magazines** → **Upload Magazine** (`/magazines/new`).
2. Creates metadata (title, dates, series/category lookups).
3. Uploads PDF / cover via `/admin/uploads` (validated MIME/size; server-generated storage keys).
4. Saves draft (`reviewStatus` DRAFT / unpublished).
5. Reviews status badges on edit form.
6. Publishes via publish action (`isPublished`, APPROVED) — requires PDF.
7. Public React site lists published magazines from public APIs.
8. Failures in storage upload report to **API Inbox** with customer-safe errors.

Statuses: Draft · In Review · Changes Requested · Approved · Archived · Published/Unpublished flags · Demo.

## 2. Edition management — Partially Working

- `/editions` presents magazines in year-archive mode.
- Magazines may reference `editionSeries`.
- There is **no** separate Edition create/publish entity. Treat Year Archive as the edition browser.

## 3. Stories and Leaders — Working

1. Create/edit in Admin Stories or Leaders.
2. Attach metadata / images as supported by forms.
3. Draft → publish (articles status / leaders `isPublished`).
4. Public website consumes published content.

## 4. Advertising campaign — Partially Working

1. Public/contact enquiry → **Advertiser Enquiries**.
2. Staff reviews enquiry status.
3. **Campaigns & Analytics** lists advertisements and impression/click report.
4. Full package builder / material upload / invoice handoff: **not fully implemented**.

## 5. Invoice management — Not Implemented

Honest page at `/finance/invoices`. No Prisma invoice model. Do not treat as live billing.

## 6. CMS publishing — Working

1. **CMS Page Editor** → select slug.
2. Edit content JSON/fields → save draft.
3. Publish (requires `pages.publish` — Super Admin by default).
4. React reads published managed pages.

## 7. Festival theme scheduling — Working

1. Super Admin / themes-capable user opens **Festival Theme Studio**.
2. Templates, assets, schedules, regional windows.
3. Scheduler priority: manual override → regional festival → global festival → default.
4. Public theme resolve API drives React appearance.

## 8. API Inbox operations — Working

1. Integration failure → `ApiInboxService.report`.
2. Dedupe by fingerprint; badges poll `/admin/api-inbox/alerts`.
3. Acknowledge → notes → resolve; recurrence after resolve opens a new incident.
4. Public users never see technical payloads.
