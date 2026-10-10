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
- Added assessment authoring, server-side grading with bounded attempts, and certificate issuance only on a passing result; certificate codes have a public verification endpoint/page.
- Added RLS integrity constraints tying progress to the learner's enrollment and the lesson's published module/course.
- Added pgTAP contract assertions in `supabase/tests/m34_academy_enrollment_progress.test.sql`.
- Assessments, grading, certificates, and payment-backed course access are **NOT IMPLEMENTED** in this increment.
- Status: **CODE PRESENT / RUNTIME UNVERIFIED**.

### M35–M39 — Talent, partners, knowledge, CRM and branding
- Existing branch code contains profile/evidence submission and admin review, partner application workflow, published knowledge browsing, CRM lead activities, and editable site settings.
- Added article source metadata and revision snapshots on editorial changes, with an admin-only history API/UI.
- Added a public navbar logo/brand-color read from the saved public settings.
- Connected configured logo path and brand color to the public navbar, and configured tagline/footer text to public footer.
- Added a partner portal over existing M04 organizations/memberships; approving an account-linked partner application creates an organization and active partner membership transactionally.
- Added article source metadata and revision snapshots on editorial changes, with an admin-only history API/UI.
- Added a public navbar logo/brand-color read from the saved public settings and a validated logo upload/replacement endpoint.
- Added CRM lead assignment and transactional status/assignment history.
- Status: **PARTIAL / RUNTIME UNVERIFIED**.

### M40 — Billing
- Existing checkout/payment migrations and provider settings are present.
- Added an authorized database transaction that locks and settles the payment and invoice together, verifies payer/amount/currency consistency, and preserves an audit-warning path.
- Cross-domain invoice/reference consistency and verified provider callback acceptance have not been proven.
- Status: **PARTIAL / RUNTIME UNVERIFIED**.

### M41 — Media lifecycle
- Added pending/uploaded state, completion confirmation, and a restrictive visibility guard to the existing media flow.
- Removed the obsolete social-only `media_one_parent` check that conflicted with the newer product/message parent invariant and blocked product/message media registration.
- Prevented a failed audit write from being misreported as failed product-media registration after the row was already committed.
- Shared lifecycle coverage for academy, knowledge, talent, and partner files plus failed-write cleanup remains open.
- Status: **PARTIAL / RUNTIME UNVERIFIED**.

### M42 — Event recovery
- Added a super-admin-only event queue API and an admin workspace displaying pending, processing and failed events with attempt count and last error.
- Added bounded manual retry (maximum three) through an admin-checked database transaction that records the actor, reason and prior attempt count.
- The UI does not claim that the worker is running; a queued retry still depends on the worker being operational.
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


## Commit handling

The work is isolated on `feat/m33-m43-domain-completion`; the main branch has not been moved by this workstream. Before release, the branch changes can be consolidated into one reviewable commit on top of its recorded base, then subjected to the requested single verification/release window when permissions are available. Do not deploy from this branch during implementation.


## Latest continuation note

- Current work remains isolated on the feature branch. Recent commits add M34 assessment authoring/grading/certificates, M36 approval-to-organization flow, M38 lead assignment/history, M39 actual logo upload, M40 atomic payment settlement, M41 media-parent correction, and M42 bounded audited event retry.
- No build, migration replay, pgTAP suite, authenticated browser test, or end-to-end acceptance has run for the current head. These are code additions, not a claim of verified completion.

## Continuation — 2026-10-10

### M33 — Pre-registration admission screening added
- Added course-specific screening questions with active/inactive state, response types, options, ordering and admin-only authoring/update APIs.
- Added public course admission form for name, email, phone, screening answers and explicit consent. The submitted application stores a snapshot of the question set used at submission.
- Added an admission application API with input validation, duplicate active-application conflict handling, admin decision transitions and owner/admin read access.
- Added an additive migration and pgTAP contract assertions for admission question/application schema and RLS policies.
- Connected the course detail page to the pre-registration form.
- Tightened the enrollment API: direct enrollment now requires a reviewed admission and a trusted paid state; an accepted application without verified payment is not enough to unlock enrollment.
- Important limit: no trusted payment callback currently advances an application to paid, so final enrollment is intentionally blocked until the existing billing/payment provider path is wired and verified. This prevents a client from bypassing admission or claiming payment success.
- Security/verification limit: anonymous application intake is permitted by the RLS policy and has no CAPTCHA/rate-limit integration in this increment. Add abuse protection before public production use. Anonymous applications are admin-visible but cannot be owner-read until a secure account-linking workflow is implemented.
- Status: CODE PRESENT / DATABASE AND RUNTIME UNVERIFIED.

### Verification status (unchanged)
- This branch has no GitHub Actions runs registered because the quality workflow is triggered by pull requests and pushes to main; feature-branch commits alone do not run it.
- No PR has been opened for this continuation, specifically to avoid triggering the deployment integration before the agreed release window.
- No Vercel dashboard, configuration, deployment, or production database operation was performed.
- The historical M00–M25 clean migration replay issue remains unresolved; these new database tests have not been executed.

### M36 — Private identity due-diligence schema added
- Added separate individual/organization identity profiles and private document metadata, with explicit consent, review states, expiry fields, and owner/organization/admin RLS.
- Organization data includes legal form, registration/tax identifiers, registered address, and authorized representative details; individual records include identity document metadata.
- Added pgTAP assertions for table/column/policy contracts.
- Not complete: secure upload/signing/scanning/retention APIs and admin review UI are not implemented by this schema-only increment. The private storage bucket must be provisioned and verified before document upload is enabled; no public document URL is generated.
- Not complete: the maximum-three-active-agents rule still requires a transaction/constraint implementation and concurrent acceptance test.
- Status: SCHEMA CODE PRESENT / MIGRATION AND RUNTIME UNVERIFIED.

### M36 — Organization representative cap
- Added a dedicated organization representative model with invitation/verification/active/suspended/revoked states, explicit authority scopes and affiliation-evidence reference.
- Added a transaction-level advisory lock plus database trigger to reject a fourth active representative for the same organization under concurrent writes.
- Added RLS for organization-scoped reads and super-admin-only writes, plus pgTAP contract checks.
- Runtime concurrency test has not run; invitation acceptance, affiliation-document review and revocation effects still require API/UI wiring and acceptance tests.
- Status: SCHEMA CODE PRESENT / MIGRATION AND CONCURRENCY UNVERIFIED.

### M41 — Dedicated marketplace checkout surface
- Added a /checkout page with required delivery recipient, phone, wilaya, address and optional delivery notes.
- Added a server action that calls the existing atomic checkout_active_cart(text, jsonb) database transaction; price and stock are revalidated and inventory reservation/order/invoice creation remain inside the existing transaction.
- Connected the cart to checkout and added an order reference confirmation that explicitly does not claim payment success.
- Existing service-request flow remains a separate service domain and uses its own validated create_service_request transaction/state-machine actions; it is not merged into product checkout.
- Not complete: product-media/admin workflows, customer order detail/cancel/return flows, verified payment initiation/callback settlement, delivery status management and end-to-end checkout tests remain to be validated.
- Status: UI/server integration CODE PRESENT / RUNTIME UNVERIFIED.
