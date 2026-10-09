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

## Translation quality and language isolation — mandatory acceptance rules

The language system is **not accepted** by adding a selector or translating only the navigation. Mixed-language interfaces are a release-blocking defect.

1. Each locale must have a complete, reviewed translation catalog for every supported UI string. No fallback to another language is allowed for ordinary UI labels, buttons, menus, form labels, validation, empty states, errors, success messages, dialogs, account pages, academy, partner portal, company pages, community, support and admin controls. If a translation is missing, use an explicitly approved fallback policy and flag the missing key in admin/development checks; do not silently mix languages within a screen.
2. English, French, Spanish, German and Portuguese copy must be professionally written for that language, not word-for-word machine translation. Arabic must be natural, correct Modern Standard Arabic suitable for a professional company. Preserve ASLAN names, product terminology, course terms and legal/payment meaning consistently using an approved glossary.
3. Use translation keys and locale-specific message catalogs (including pluralization, number/date formatting and interpolation), never inline conditional fragments that combine languages. A whole message must resolve from one locale catalog.
4. Separate UI translation from editorial content. Course titles, lesson text, videos, exercises, partner documents and knowledge articles need an explicit per-locale version/status. Do not claim course content is translated unless a reviewed translation exists; retain the original-language label when appropriate.
5. Add automated completeness checks: all six catalogs must contain the same required keys; reject empty values, accidental source-language copies where inappropriate, unresolved keys and malformed interpolation placeholders.
6. Add UI integration tests for each locale covering homepage, navigation, product/service, academy admission and payment states, partner application, account/community, support and admin. Assert the correct `lang` and `dir`, and assert that no missing-key markers or unapproved foreign-language fallback strings appear.
7. Require human linguistic review by a fluent/professional reviewer for all six locales before production release, including terminology, tone, grammar, regional appropriateness and consistency. Automated tests detect omissions; they cannot certify translation quality.
8. Use locale-aware SEO metadata and language alternates only for pages that genuinely have a reviewed equivalent. Do not label untranslated pages as localized.
9. Release criterion: **100% of required UI keys covered and reviewed in all six locales for the release scope, with zero known mixed-language UI defects.** If a locale is not complete, it must not be presented as fully supported; show an explicit availability state rather than a misleading language toggle.

Current repository observation (2026-10-09): the root layout currently hard-codes `lang="ar"`, `dir="rtl"` and Arabic OpenGraph metadata, while the navigation labels are Arabic literals. Therefore six-language support is a requirement, **not yet a verified implemented feature**. The language selector and shared locale runtime must be built and tested before declaring support.

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


## Identity, due diligence and verified payout profiles (students, individual partners and organizations)

This is a mandatory account/onboarding domain requirement. Collect only what is needed for the role and legal purpose, keep identity documents private, and do not treat an uploaded image as verified until a reviewer or approved verification process has checked it.

### Individual student and individual partner
- A structured legal identity profile: full legal name exactly as shown on the government-issued document; date of birth where legally required; nationality/country of document; document type (national identity card or passport, according to the country and role); document number; issuing authority/country; issue and expiry dates when present.
- Contact details: verified mobile phone number and verified email address. “Gmail” is not a separate required category; accept any valid email provider. Support a primary contact and, only where needed, an alternate contact.
- Identity evidence upload must support clear front/back images for identity cards and the relevant passport page(s), using image/PDF formats approved by policy. Validate file type/size, scan uploads, use private storage, short-lived authorized access, access logs, and retention/deletion rules. Never expose identity-document URLs publicly.
- Capture explicit consent and purpose before collection. Show application status (not submitted, pending review, needs information, verified, rejected, expired) and a safe reason/action for rejected or incomplete evidence. Prevent access to gated course, partner, or payout features until the required checks pass.
- Compare submitted profile fields against the document and record reviewer, timestamp, outcome, discrepancy codes and review notes. Do not claim automated image/face matching unless an actual approved provider and tested workflow exist. Do not store biometric templates by default.

### Individual partner payout details
- Where an individual partner is entitled to a commission, fee or other payment, collect beneficiary name and the minimum payout details required by the selected payment rail and country (for example bank/account identifier and bank/branch details if applicable).
- Verify that the beneficiary name is consistent with the verified identity, or require documented review for a legitimate exception. Do not collect card PINs, passwords, one-time codes or online-banking credentials.
- Payout details are sensitive and must be separately permissioned from public profile data, masked in routine views, audited, and change-protected with re-verification.

### Organization / company partner
- Organization legal identity: registered legal name, legal form, country and registered address, commercial/registration number, tax identification and other applicable official identifiers, registration/issue/expiry dates where applicable, and official business contact details.
- Required evidence is country- and entity-type-specific. Provide configurable document requirements rather than assuming every country uses the same commercial register or tax card. Typical evidence may include a commercial/company registry extract, tax registration certificate/card, proof of registered address, and any applicable license or internationally recognized supporting documents. Accept legible image files and PDF; record issuing jurisdiction, document type, expiry and review status.
- Record the organization's authorized legal representative / signatory, their role and authority evidence (such as an authorization or board resolution where required). An uploaded company logo or an employee's assertion alone does not establish authority.
- Require up to **three named organization representatives/agents total per organization** (not more than three), with an explicit organization owner/administrator role and role-specific permissions. The organization onboarding flow must collect and verify each agent's own account, identity, business contact details, professional ID/card or equivalent evidence of employment/affiliation, job title and authority to represent the company. The organization must identify who may sign contracts, manage opportunities and approve payout changes.
- Each agent must accept an invitation or verify control of their account and consent to being linked to the organization. Verify affiliation and role against organization evidence; record reviewer, timestamp, status, expiry and revocation history. Enforce the maximum of three active agents server-side and in database constraints/transactions, not only in the UI.
- For organization payouts, collect beneficiary legal name and payout account evidence in the organization's registered name where supported. If a third-party beneficiary or mismatched name is legally permissible, route it to enhanced manual review and store the reason/authorization. Never allow an agent's personal payout account to silently replace the organization's beneficiary account.
- Re-check expired documents and material changes to legal name, registration, representatives, tax data or payout destination. Suspend only the affected privileged actions where possible, with an auditable review process.

### Security, privacy, audit and acceptance tests
- Use private object storage with server-side authorization; restrict document access to the subject and specifically authorized compliance/admin roles. Do not expose documents to other students, partners, public pages, analytics, logs or AI prompts by default.
- Apply least-privilege roles, encryption in transit and at rest, rate limits, upload validation/malware scanning, audit trails, and configurable retention/deletion. Keep identity evidence separate from public profile data.
- Make document requirements and validation rules configurable by country, role, organization type and payout method. Before production, obtain jurisdiction-specific legal review for applicable privacy, KYC/AML, tax, employment and payment obligations; do not label a document “internationally certified” without defining the actual accepted standard and issuing authority.
- Required tests: unverified account cannot pass gated onboarding; document mismatch routes to needs-information or rejection; expired evidence blocks the affected action; unauthorized document download is denied; one organization cannot access another's files; a fourth active agent is rejected even under concurrent requests; revoked agents lose access immediately; organization payout-name mismatch triggers review; changing payout destination requires re-verification; sensitive fields are masked; audit events capture review and changes; deletion/retention policy is enforced.
- This section records product requirements only. It does not claim that identity verification, document storage, payout verification, or the three-agent limit is implemented until schema, APIs, UI, authorization policies and automated tests are added and verified.
