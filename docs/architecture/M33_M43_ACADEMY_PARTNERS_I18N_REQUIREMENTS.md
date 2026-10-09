# M33–M43 Domain Completion — Academy, Partnerships and Six-Language Requirements
Updated: 2026-10-09

This is a build contract for the existing ASLAN Modelling Group application. It does not replace the modular-monolith architecture, rebuild the application, or claim acceptance before tests pass.

## Global language system (shared by all domains)
Supported locales, in required order:
- `ar`: Arabic (RTL)
- `fr`: French (LTR)
- `en`: English (LTR)
- `es`: Spanish (LTR)
- `de`: German (LTR)
- `pt`: Portuguese (LTR)

Requirements:
1. A single locale preference and translation contract must be shared by the group homepage, product/service marketplace, Academy, Partner portal, company pages, community, support, account and admin surfaces.
2. Locale selection must persist across navigation and authenticated sessions; use an explicit user preference when signed in and a first-party cookie/local preference for guests. Resolve conflicts deterministically.
3. The selected locale must set document `lang` and `dir`; only Arabic is RTL.
4. No page should be marked translated merely because a selector exists. User-facing navigation, forms, validation, success/error notices, emails/notifications, course content metadata, partner workflows and admin controls need locale coverage.
5. User-authored content should remain in its original language unless translated content has been explicitly supplied; do not silently machine-translate legal, payment or course assessment text.
6. Site/admin controls should permit publishing and maintaining translations, with a safe fallback to the primary/original locale when a translation is missing.
7. Currency, locale and language are separate concepts: language selection must not silently change a course fee, payment currency, user identity or legal terms.

## Academy admission contract (M33–M34)
Registration is a gated workflow, not a one-click direct enrollment:
1. Public course page states prerequisites, level, language, price, schedule, expected outcomes, capacity and admission requirements.
2. Each course owns its admission configuration, message templates and rules; the Academy also has global defaults. Course-specific rules override defaults explicitly.
3. Before accepting an application, show the course's screening/qualification prompt(s). Record answers, consent, version of rules and timestamps.
4. Application states should be explicit: `draft → submitted → screening → accepted | rejected | needs_information → payment_pending → paid → enrolled`, with cancellation/expiry where applicable. Payment must not occur before admission is accepted.
5. Notify applicants at submission, when review is needed, on acceptance/rejection, before payment, on confirmed payment, on enrollment, and on important course milestones. Messages must be localized and auditable.
6. Never grant paid-course access based on client-side state or a return URL alone. Verify provider callback/signature, amount, currency, order/application owner and idempotency before changing the payment/enrollment state.
7. Course levels are separate explicit tracks: beginner/primary and professional/advanced. Each level has its own prerequisites, modules, lessons, assessments, progress and access rules.
8. Lessons, videos, files and practical exercises unlock progressively according to the course's configured order and prerequisites. Access checks belong server-side and in RLS where applicable.
9. Track progress per learner, course, level, module, lesson and assessment. A passed assessment must be server-graded against a versioned rubric; certificates require defined completion and identity criteria.
10. Small learner groups are formed for a course/level after a configured progress or assessment threshold. Membership, visibility, moderation, group messages and resources must be scoped to eligible learners and authorized staff. Users cannot self-assign to a restricted group.
11. Instructor/admin workflows must support content upload, draft/review/publish, ordering, replacement, access rules and audit history. Do not expose storage object paths for restricted lessons as public links.
12. Required tests: unauthorized enrollment, failed screening, rejected application, payment-before-acceptance, forged payment callback, duplicate callback, wrong amount/currency/owner, lesson skipping, cross-course progress, unauthorized group access, localization fallback and notification failures.

## Partner platform contract (M35–M36)
- Separate public application from the authenticated partner workspace.
- Application has configurable partner type, evidence requirements, screening/review, statuses, messages and localized templates.
- Approval provisions or links the authenticated account to a partner organization only after server-side admin approval.
- Organization records, staff, opportunities, documents, leads, conversations and metrics are scoped to that organization. No partner can read or modify another organization's data.
- Support request-for-information, approved/declined/needs-information decisions, resubmission, document expiry and audit events.
- A partner must never gain administrative privileges merely by submitting or being approved for a partner application.
- Tests: anonymous submission limits, duplicate application, unauthorized organization access, role escalation, file access, approval audit and localized notifications.

## Homepage and group-wide navigation
- The homepage represents ASLAN as a multi-activity group, not a single upholstery business.
- Main sections should be CMS/configuration-driven: group introduction, production, services, academy, partnerships, knowledge/technology, community, and contact/support.
- Each locale needs translated navigation, calls to action, labels, accessibility names, SEO title/description and appropriate OpenGraph locale.
- Missing translation falls back predictably and is identifiable to admins; do not show mixed-language UI without a fallback policy.
- Admin settings must support logo, brand colors, tagline, homepage section visibility/order/content and translations with validation and preview.

## M43 acceptance gate
A feature is complete only when code, schema migration, authorization/RLS, UI states, audit/notifications, locale coverage and automated tests are present. Build success alone is not functional acceptance. If migration replay is blocked by the historical M00–M25 order/source defect, continue independent implementation but mark database-dependent acceptance blocked; do not fake a passing test or silently reorder historical migrations.
