# ASLAN M18â€“M25 â€” Operational platform delivery

## Source of scope
This implementation follows the official ASLAN master reference capabilities for notifications/support/reviews, administration, least-privilege access, database integrity, security, SEO, analytics and documentation. These are operational flows, not decorative buttons.

## M18 â€” Notifications, support and verified reviews
- Notifications are persisted per recipient with read/unread state.
- Order creation, payment status changes, service status changes, support-ticket creation/updates and review moderation generate deduplicated in-app notifications.
- Support tickets have a ticket number, category, status, priority, admin response and timestamps.
- Reviews can only be submitted through a database function that verifies a fulfilled product order or completed service. Direct browser inserts are revoked; publication requires admin moderation.
- Acceptance: owner isolation, ticket lifecycle, read state, rejection without qualifying transaction, duplicate-review prevention, approved-only public reads.

## M19 â€” Administration
- /admin/communications provides the support queue, review moderation and recent analytics.
- Server actions verify super_admin, validate inputs and revalidate affected pages.
- Acceptance: anonymous users redirect to login, non-admin mutations are denied, admin changes persist and notify customers.

## M20 â€” Roles and permissions
- Existing RBAC remains authoritative. Admin mutation¶»§q«^