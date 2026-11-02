# Publisher and editor guide

## First access

Create an administrator with `python manage.py createsuperuser`, start the site, then sign in at `/admin/`. Only Django staff accounts can use the administration interface. Create separate staff accounts and grant only the model permissions each role needs.

## Staff roles and magazine approval

Run `python manage.py setup_roles` after migrations to create or refresh the least-privilege groups **Content Editors**, **Publication Reviewers**, **Publication Publishers**, **Advertisement Managers**, and **Client Enquiry Managers**. The command only configures group permissions: it does not create accounts, set `is_staff`, or grant superuser access. A trusted superuser must assign staff status and the intended group to each staff account. Superuser access should be limited to account and emergency administration.

Content editors can upload editions from `/manage/magazines/upload/`. Uploads require a valid PDF and remain unpublished, either as a draft or awaiting review. Drafts and editions needing changes can be submitted from `/manage/magazines/`. A reviewer uses that page to approve an edition or request changes. A publisher can publish an approved issue only when its PDF is present; publishing, unpublishing, archiving, submission, and review decisions are recorded in the read-only management audit log. Users without staff status are denied access even if a model permission was accidentally assigned.

Advertisement Managers can maintain campaigns and view aggregate advertising events. Reviewers and Publishers can view magazine workflow audit events. Assign additional Django model permissions only when a role needs them. Keep user administration restricted to trusted administrators.

## Client enquiries and reader preferences

The public `/contact/` form stores business enquiries in Django Admin under **Client enquiries**. Assign staff members to the **Client Enquiry Managers** group and mark them as staff to grant access; the group does not grant admin access by itself. Managers can assign enquiries, update their status, add private internal notes, and set follow-up dates. A signed-in submitter can view only their own enquiry, and client pages do not show internal notes. Configure the mail provider plus `CONTACT_RECIPIENT_EMAIL`, `DEFAULT_FROM_EMAIL`, and `PUBLIC_SITE_URL` to enable email alerts; without those settings the enquiry is still saved and visible in Admin, but no email is delivered. A successful backend handoff is not a guarantee of delivery.

Signed-in readers can select followed categories in their account preferences. New public articles and magazine issues in those categories create an in-app notification on publication; member-only content is notified only to staff and `Subscribers` group members. Publication notifications are deduplicated per content item. Editors can mark original articles and magazine issues with a language and link translated records to their source; this stores metadata and links only and does not translate content automatically.

## Preparing a publication

1. Add categories, editions, and author profiles before creating related content.
2. Write an article and leave it as **Draft** while it is in progress.
3. Use **In review**, **Changes requested**, and **Approved** to record the editorial state. This release stores status only; comments, assignment, approvals, and revision comparison are not yet implemented.
4. To publish immediately, select **Publish selected articles** in the article list. To schedule an approved article, set its status to **Scheduled** and `Published at` to a future time.
5. Run `python manage.py publish_scheduled` periodically (for example, with Windows Task Scheduler or a Linux cron timer) to publish due articles. The command is safe to run repeatedly.
6. For new editions, use the management upload and approval workflow below. A publisher can publish only an approved edition with a valid PDF.

Only published articles with a publication time that has arrived, and published magazines with a publication date that has arrived, are shown publicly. Sponsored articles carry a visible sponsored label. Editions already published before the workflow migration remain published and are marked approved for continuity; review their PDF availability and publication status as part of the migration verification.

## Member access

Create a Django auth group named `Subscribers` and add entitled reader accounts to it. Staff accounts are also allowed through protected content checks. This is an editorial/manual access gate only; subscription records and payment processing are not connected.

Private PDF files are stored separately from public media and delivered through the magazine PDF endpoint after publication and access checks. The `Allow download` option controls attachment downloads; it cannot stop readers from saving an inline PDF displayed by their browser.

The **Read magazine** action opens a protected PDF.js reader at `/magazines/<slug>/read/`. It loads the same authorization-checked private PDF route, obtains the document's page count from the PDF, and provides page navigation, zoom, fit width, fullscreen, keyboard navigation, current-page printing, and a protected link to open the full PDF in the browser's native viewer. A missing PDF has no reader or download action. Set the publisher name and optional related articles/issues in the magazine's **Related content** Admin fieldset; category-based recommendations are used when explicit relationships are empty.

The reader-related database fields are `Magazine.publisher_name`, `Magazine.related_articles`, and `Magazine.related_magazines`. Its supporting routes are `/magazines/<slug>/read/` for the reader and `/magazines/<slug>/pdf/` for the protected inline/download response. No additional environment setting is required; PDF.js 4.10.38 and its worker are served locally from static files.

Signed-in readers have a private account library for saved articles and magazine issues, plus recently viewed items. The PDF reader saves the last page when a reader changes pages and resumes there on the next visit; guests can read but their page progress is not stored. Reading history and progress are recorded only after the reader passes the content's normal access checks. The account page only lists content the reader can currently access; each reader's saved items and history are isolated to their own account.

## Advertising campaigns

Create campaigns in **Advertisements** in Django Admin. The `Advertisement` model stores campaign content, placement, schedule, and tracking flags. Choose one of the eight slots, configure a complete HTTP(S) destination, optional image and alternative text, priority, and optional start/end times. Only active campaigns within their schedule are rendered. The campaign image/description is treated as a link to the configured destination; uploaded HTML and JavaScript are not supported. Clicks redirect to the stored campaign URL, not a client-supplied URL.

The available slots are homepage banner, homepage editorial sidebar, magazine detail sidebar, reader sidebar, between editorial sections, related-magazine promotion, newsletter sponsorship, and featured-partner promotion. A slot with no eligible campaign is omitted. The reader's impression condition is at least 50% visibility in the browser viewport; a slot is submitted once per page view to `/ads/<id>/impression/`. Clicks are recorded through `/ads/<id>/click/` when a reader follows the campaign link. `AdvertisementEvent` stores only campaign, placement, event type and timestamp—no user, session, IP address, or other visitor identifier. The report at `/admin/reports/advertising/` requires staff status and the `view_advertisement` permission and reports cumulative total events, not unique reach. Demo-seeded campaigns are explicitly labeled fictional and point only to `example.test`.

## Homepage and newsletter

The single **Site configuration** record controls site branding, homepage hero copy, featured content, and newsletter messaging. Until it is saved from Admin, the public site renders the built-in defaults without writing to the database during a page request.

Newsletter signup stores an email, consent timestamp, and unique unsubscribe token. No marketing email is sent in this release. After signup, the same browser session sees an unsubscribe link; staff can also deactivate subscribers in Admin.

Use **Announcements** to add an optional masthead announcement. Set its active flag and optional start/end times; only an active announcement within its date window is shown. A link appears only when both a label and URL are supplied.

For a local client preview, run `python manage.py seed_demo_data`. The command is repeatable, uses reserved `demo-*` identifiers and fictional names, and does not overwrite existing content. It includes a short, original two-page fictional PDF on the clearly labeled **Digital Reader Demonstration** issue, so the protected reader can be tested without uploading an actual publication. Run `python manage.py seed_demo_data --cleanup` to remove only its reserved records and stored demo PDF. Cleanup refuses to continue if non-demo editorial content references seeded records, a reader has saved or viewed seeded articles or magazines, or a seeded campaign has recorded advertisement events. Both modes require `DJANGO_DEBUG=True`. Do not treat demo copy, campaigns, the reader sample, or the `example.test` contact records as real editorial material, advertisers, or consented subscribers.

## Leaders, dispatches, and partner strip

Create a **Featured leader** record with a name and a link to a published article or magazine. The public directory only includes records marked published whose linked content is public and available. Add an approved portrait, role, organization, category, and publication date when that information is available; do not infer credentials or biographies. The leader page and year/category/edition/name filters are generated from these records.

Create up to four **Homepage section** records to choose visible category dispatches, their headings/subtitles, and order. A section shows its selected published articles when configured, otherwise up to three current published articles from its category. **Partner organizations** appear only when configured and visible; add logos and links only with permission. Magazine cover alt text can be entered in the **Cover and PDF** admin fieldset.

Magazine records without an uploaded cover use an editorial CSS cover fallback; records without a PDF show a preview-unavailable notice and do not display PDF actions. The fallback is not a downloadable cover image. The reader uses locally vendored PDF.js assets; keep the accompanying third-party license file when distributing the site.

The public magazine directory filters by year, category, regional edition, and title/leader search. Filter values are query parameters and persist across pagination. Its optional **Trending with readers** strip ranks public editions by distinct signed-in-reader history during the previous 30 days; it is omitted when there is no recent activity and does not include anonymous visitors.
