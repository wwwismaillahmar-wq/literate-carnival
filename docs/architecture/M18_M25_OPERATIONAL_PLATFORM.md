# ASLAN M18–M25 — Operational platform delivery

## Source of scope
This implementation follows the official ASLAN master reference capabilities for notifications/support/reviews, administration, least-privilege access, database integrity, security, SEO, analytics and documentation. These are operational flows, not decorative buttons.

## M18 — Notifications, support and verified reviews
- Notifications are persisted per recipient with read/unread state.
- Order creation, payment status changes, service status changes, support-ticket creation/updates and review moderation generate deduplicated in-app notifications.
- Support tickets have a ticket number, category, status, priority, admin response and timestamps.
- Reviews can only be submitted through a database function that verifies a fulfilled product order or completed service. Direct browser inserts are revoked; publication requires admin moderation.
- Acceptance: owner isolation, ticket lifecycle, read state, rejection without qualifying transaction, duplicate-review prevention, approved-only public reads.

## M19 — Administration
- /admin/communications provides the support queue, review moderation and recent analytics.
- Server actions verify super_admin, validate inputs and revalidate affected pages.
- Acceptance: anonymous users redirect to login, non-admin mutations are denied, admin changes persist and notify customers.

## M20 — Roles and permissions
- Existing RBAC remains authoritative. Admin mutations check has_role('super_admin'); table policies use private.is_super_admin().
- Customer rows remain owner-scoped; analytics is admin-read only.

## M21 — Database integrity
- Added tables use keys, foreign keys, bounded fields, status checks, unique dedupe keys and queue indexes.
- Review eligibility is checked in PostgreSQL, not trusted from form fields.
- Important source-of-truth gap: production's migration registry contains M11/M14 foundation migrations whose SQL files are absent from Git. Restore those historical source files before claiming a fresh database can replay the entire history.

## M22 — Security and operations
- RLS is enabled on all new tables.
- Browser clients cannot insert notifications or reviews directly.
- Analytics accepts only allowlisted events, validates same-origin requests, stores no IP/device fingerprint and runs only after opt-in consent.
- Payment-completed events must only be emitted by a trusted payment callback/workflow; client page views are not proof of payment.

## M23 — SEO
- Sitemap lists public marketing/catalog routes only.
- Robots disallows private account, checkout, order, support and administration paths.
- Canonical origin is configurable through NEXT_PUBLIC_SITE_URL.

## M24 — Analytics
- First-party page views are opt-in; rejecting consent disables collection.
- Events include only a limited referrer host and campaign tags.
- Admin counts reflect stored events; no fabricated traffic, revenue or conversion metrics are presented.

## M25 — Documentation and acceptance
- This file records scope and invariants.
- Production completion requires applied migration, green CI, READY production deployment, authenticated ticket lifecycle tests, review-eligibility tests and runtime checks. A successful build alone is not acceptance.
