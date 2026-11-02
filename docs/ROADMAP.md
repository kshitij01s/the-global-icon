# Product roadmap

The responsive editorial homepage, native magazine carousel, leader profiles and filtered catalog, partner strip, configurable category dispatches, filtered magazine archive, protected PDF.js reader, and scheduled advertising placements/reporting are implemented and described in the publisher guide.

## Next: publishing operations

- Rich-text editing, autosave, revision history, reviewer comments, author/editor assignment, and audit trail.
- Automated email/in-app notifications and double-opt-in newsletter flows.
- User registration, email verification, password reset, and self-service profiles.
- Reader bookmarks, page-level progress, and reading analytics.

## Commercial platform

- Subscription plans, entitlement records, provider abstraction, verified/idempotent payment webhooks, renewals, and cancellation.
- Campaign budgets, invoicing, frequency capping, and unique-reach attribution.
- CRM leads, assignments, follow-ups, retention controls, and permission-checked exports.
- Newsletter campaign authoring, provider integration, suppression management, delivery reports, and scheduling.

## Intelligence and integrations

- Configurable AI provider adapter with input limits, rate limits, usage records, human-reviewed suggestions, and no automatic publishing.
- REST API with authentication, object permissions, pagination, rate limits, versioning, schema documentation, and authorization tests.
- Privacy-conscious analytics event pipeline and dashboards with explicit metric definitions and CSV reports.

## Production readiness and scale

- Configurable S3/R2 object storage and durable private-file delivery.
- MySQL integration tests, CI workflow, dependency checks, backup/restore drills, health monitoring, log retention, deployment and rollback automation.
- Further tenant-isolation work before any multi-tenant SaaS offering; current editions and branding are single-publication only.
