# Dashboard Structure — THE GLOBAL ICON Admin

Angular console (`apps/admin-dashboard`) uses one shell for Admin and Super Admin. Visibility is filtered by `ACCESS` rules; **authorization is enforced by NestJS guards**.

## Sidebar sections

| Section | Routes | Typical roles |
|---------|--------|----------------|
| Overview | `/` | Any staff with `dashboard.view` |
| Content Management | Magazines, Upload, Editions archive, Stories, Leaders | Editorial + Admin |
| Website Management | CMS Page Editor, Announcements, Settings | Content / Site |
| Advertising | Campaigns & Analytics, Enquiries | Ad / Enquiry managers |
| Financial | `/finance/invoices` | Anyone with dashboard (shows **Not Implemented**) |
| Operations | API Inbox | `api_inbox.*` |
| Appearance & Themes | Theme Overview, Festival Theme Studio | `themes.*` |
| Access Management | Users & Roles | `users.manage` |

## Super Admin differences

- Console label: **Super Admin console**.
- Dashboard heading: **Global Overview**.
- Additional capabilities via permissions: manage admins, site settings update, theme manage/schedule, page publish.
- Same navigation shell — no duplicate app.

## UX conventions

- Collapsible nav groups.
- Breadcrumbs in the top bar.
- Account + Sign out in sidebar and top bar.
- API Inbox badge (critical styling when criticalCount > 0).
- Dashboard ops strip + workflow shortcut cards.
- Empty / loading / error states on list pages.
- Destructive actions use existing confirm patterns per page.

## Branding

Navy / charcoal sidebar, gold accents, light content surface — matches existing TGI admin tokens in `styles.scss`.
