# M33–M43 Build Progress Log — 2026-10-09

This log is an implementation record, not an acceptance certificate.

## Current branch
- Branch: `feat/m33-m43-domain-completion`
- Latest known commit before this log: `8c00a2f46b93bef0df98429ecde17fd636cdb999`
- Verification: no GitHub Actions run is currently registered for this branch; build and runtime acceptance remain unverified.
- Explicit boundary: no Vercel dashboard, deployment, or configuration operations; no production database migrations executed.

## Work added during this continuation

### M33 — Academy catalogue and published curriculum
- Added a public course detail page that reads course records from the existing `courses` table.
- Public curriculum display is restricted to published modules and lessons.
- Added RLS select policies for published modules and lessons; draft/archived content remains protected by admin policy.
- Status: **CODE PRESENT / RUNTIME UNVERIFIED**.

### M34 — Enrollment and learner progress
- Added `academy_enrollments` and `academy_lesson_progress` with unique keys to prevent duplicate enrollment and duplicate progress rows.
- Added authenticated APIs for enrollment and lesson-progress read/write.
- Added a learner UI to enroll and mark lessons complete, with visible error handling.
- Added RLS integrity constraints tying progress to the learner's enrollment and the lesson's published module/course.
- Added pgTAP contract assertions in `supabase/tests/m34_academy_enrollment_progress.test.sql`.
- Assessments, grading, certificates, and payment-backed course access are **NOT IMPLEMENTED** in this increment.
- Status: **CODE PRESENT / RUNTIME UNVERIFIED**.

### M35–M39 — Talent, partners, knowledge, CRM and branding
- Existing branch code contains profile/evidence submission and admin review, partner application workflow, published knowledge browsing, CRM lead activities, and editable site settings.
- Connected configured logo path and brand color to the public navbar, and configured tagline/footer text to public footer.
- Gaps remain: partner organization portal, knowledge versioning/source references, complete CRM assignment/status audit, and safe logo upload/replacement lifecycle.
- Status: **PARTIAL / RUNTIME UNVERIFIED**.

### M40 — Billing
- Existing checkout/payment migrations and provider settings are present.
- Cross-domain invoice/reference consistency and verified provider callback acceptance have not been proven.
- Status: **PARTIAL / RUNTIME UNVERIFIED**.

### M41 — Media lifecycle
- Added pending/uploaded state, completion confirmation, and a restrictive visibility guard to the existing media flow.
- Shared lifecycle coverage for academy, knowledge, talent, and partner files plus failed-write cleanup remains open.
- Status: **PARTIAL / RUNTIME UNVERIFIED**.

### M42 — Event recovery
- Added a super-admin-only event queue API and an admin workspace displaying pending, processing and failed events with attempt count and last error.
- The UI intentionally does not claim that the worker is running and does not perform an unsafe manual retry.
- Status: **OBSERVABILITY CODE PRESENT / RUNTIME UNVERIFIED**.

### M43 — Cross-domain acceptance
- Added database contract assertions for the M33–M34 schema/policies.
- Tests have not run. Clean migration replay remains blocked by the known M00–M25 historical migration-order/source issue; this branch currently has no fresh GitHub Actions evidence.
- End-to-end acceptance across market, services, academy, talent, partners, billing, media and admin remains open.
- Status: **PARTIAL / BLOCKED ON VERIFICATION**.

## Next implementation targets
1. Complete learner assessment/scoring and certificate issuance.
2. Finish partner organization-scoped portal and CRM assignment/state audit.
3. Complete brand-asset upload/replacement and cross-domain media policy.
4. Strengthen billing callback/idempotency contracts without trusting client payment status.
5. Add admin recovery actions only with audit trail, retry ceilings and explicit terminal states.
6. Expand M43 tests and run them when repository verification permissions are available.
