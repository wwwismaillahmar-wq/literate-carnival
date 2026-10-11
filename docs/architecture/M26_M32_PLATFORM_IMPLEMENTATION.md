# ASLAN M26–M32 Platform Implementation

**Branch:** `feat/m26-m32-platform-foundation`  
**Scope:** M26 Search; M27 Notifications; M28 Support / Complaints / Knowledge Base; M29 Analytics / Reporting; M30 AI Platform; M31 Recommendations; M32 Admin Control Center.

## Implemented in this change set

- **M26:** `GET /api/platform/search` validates query length and pagination, searches products/services/courses/public posts/public contributions/published knowledge, records only a SHA-256 query hash for authenticated searches, and returns unavailable sources explicitly instead of hiding partial failure.
- **M27:** `GET/PATCH /api/platform/notifications` lists only the signed-in recipient's notifications and marks one/all unread notifications as read. The API reuses the existing `notifications` table and its recipient-scoped access rules.
- **M28:** `GET/POST/PATCH/DELETE /api/platform/knowledge` supports published public reads, admin drafts/publishing/editing and archive-on-delete, with validation, unique-slug conflict handling and RLS. Existing support-ticket workflows remain in the established M18–M25 surface.
- **M29:** `GET /api/platform/analytics?days=30` is super-admin-only, clamps the reporting period to 1–90 days, groups stored analytics events and reports truncation.
- **M30:** `POST /api/platform/ai` keeps provider credentials server-side, validates input, enforces a per-user hourly quota, records a non-reversible input hash, applies a provider timeout and persists success/failure. It returns an explicit 503 until server environment variables `ASLAN_AI_BASE_URL`, `ASLAN_AI_API_KEY`, and `ASLAN_AI_MODEL` are configured.
- **M31:** `GET /api/platform/recommendations` returns explainable rule-based active-product recommendations, optionally filtered by category, and records algorithm-version telemetry for authenticated users. It does not claim AI personalization.
- **M32:** `/admin/platform` and `GET /api/platform/admin` provide a super-admin-only control center with live counts and truthful per-source read errors.

## Schema

Migration `20261009140000_m26_m32_platform_foundation.sql` adds knowledge articles, AI request audit/quota records, recommendation telemetry and privacy-preserving search telemetry. It is additive and does not rewrite historical migration IDs.

## Required verification before declaring these stages complete

1. Run clean migration replay and pgTAP on this branch; existing repository migration-order issues are tracked separately in PR #22.
2. Run `npm ci`, ESLint, TypeScript and production build on this exact head.
3. Test unauthenticated and non-admin denials for admin routes; recipient isolation and cross-user update rejection for notifications; duplicate article slug and draft/public visibility; search partial-source failures; AI missing-config, timeout, provider error, quota and persisted result read-back; recommendations with/without category.
4. Confirm the deployment integration remains suppressed; no deployment or production database operation is authorized.

## Honest completion status

These are concrete first-pass module implementations, not proof that M26–M32 are fully accepted. M27 reuses the established `notifications` table and existing notification page/actions; the new API adds recipient-scoped reading and an admin-only dispatch path. M28 adds the knowledge base while reusing the established support-ticket workflow. AI stays unavailable until provider credentials are configured. Runtime acceptance remains required.

## GitHub Actions evidence

- Run [37933666249](https://github.com/wwwismaillahmar-wq/literate-carnival/actions/runs/37933666249): locked dependency install, ESLint, TypeScript check, and Next.js production build all passed on the M26–M32 pull request.
- This workflow run did not execute a clean migration replay or pgTAP. The separate PR #22 database gate is still blocked by earlier M00–M25 migration ordering/schema issues, so the new pgTAP assertions have not yet been executed against a fully replayed database.
- No authenticated end-to-end route suite has been run yet. Do not treat the passing build as proof of route authorization, persistence/read-back, AI provider operation, or notification delivery.
