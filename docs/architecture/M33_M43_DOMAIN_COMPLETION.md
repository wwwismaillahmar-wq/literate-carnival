# ASLAN M33–M43 — Domain Completion Workstream

**Repository:** `wwwismaillahmar-wq/literate-carnival`  
**Branch:** `feat/m33-m43-domain-completion`  
**Base:** `feat/m26-m32-platform-foundation`  
**Rule:** implementation first, evidence-based status; no Vercel dashboard/config/deployment operations and no production database mutations.

## Scope boundary

The tracked repository currently documents M00–M25 and M26–M32, but does not contain an authoritative M33–M43 stage-name list. This workstream therefore maps the remaining capabilities explicitly named in the ASLAN Master Reference and the repository closure ledger into an implementation sequence. It does not claim that these labels were already present in the repository.

## M33–M43 execution sequence

| Stage | Domain | Observable outcome | Acceptance gate |
|---|---|---|---|
| M33 | Academy catalog and course authoring | Real course catalogue, admin authoring, persisted publication state | Authenticated admin CRUD; public only sees published courses; persistence/read-back |
| M34 | Learning delivery, progress and assessment | Modules/lessons, enrollment, progress, quiz attempts and certificates | Enrollment ownership, progress persistence, scoring invariants, duplicate-attempt handling |
| M35 | Talent profiles and verified evidence | Skills, training history, portfolio and controlled public profile | Owner/admin authorization; public visibility is consent-based; evidence state cannot be self-certified |
| M36 | Partners and company workflows | Partner application, organization membership, partner requests and scoped portal | Organization isolation; authorized state transitions; persistence and audit |
| M37 | Encyclopedias and structured knowledge | Versioned encyclopedia entries, categories, references and editorial review | Draft/public separation, admin moderation, safe slug uniqueness and source metadata |
| M38 | CRM and relationship pipeline | Customer/partner leads, assignment, follow-up history and status transitions | Owner/admin access, validated transitions, deduplication and traceable updates |
| M39 | Platform configuration and brand content | Persisted editable site settings/brand assets wired to actual public surfaces | Super-admin-only writes; validation; visible read-back; safe media replacement/cleanup |
| M40 | Billing lifecycle completion | Consistent invoice/payment/order/service/academy references and provider adapter contracts | Trusted payment state only; idempotent callback handling; owner isolation; no client-trusted payment success |
| M41 | Media and document lifecycle | Shared upload/read/delete policy across products, academy, knowledge, talent and partners | MIME/size validation, authorization, signed URL expiry, cleanup on failed DB writes |
| M42 | Events, background work and recovery | Observable job states, bounded retries, idempotent processing and failed-job recovery | Duplicate delivery safety, retry ceiling, explicit terminal failure and admin visibility |
| M43 | Cross-domain integration and acceptance harness | Repeatable tests across identity, market, services, academy, talent, partners, billing and admin | Fresh CI, migration replay, database tests, authorization negatives, persistence/read-back and regression suite |

## Implementation invariants

1. Keep the current Next.js App Router, TypeScript, Supabase SSR, existing RBAC, and RLS as the source of truth.
2. Do not create duplicate users, roles, organizations, notifications, payment, or audit systems.
3. Prefer the existing domain tables and contracts; add schema only where a concrete workflow needs it.
4. Every mutation must validate input, enforce authorization server-side, handle errors honestly, and prove persistence by read-back.
5. No decorative/inert action is considered implemented.
6. Do not claim M00–M25 or M26–M32 accepted merely because later stages compile.
7. Do not operate Vercel or change deployment settings. GitHub Actions is the code-verification path.
8. No production database writes or migrations are run from this workstream.

## Known dependency and release risk

The repository's M00–M25 closure ledger reports that clean migration replay is blocked because `20260908070000_aslan_core_security_and_catalog.sql` alters `public.products` before `20261001000000_aslan_foundational_schema.sql` creates it; historical M11/M14 SQL source is also missing. New domain schema must be designed to the accepted target contract, but its clean-replay acceptance remains blocked until the authoritative historical sources/order are restored. Do not fabricate the missing historical migrations.

## Status semantics

- `IMPLEMENTED / VERIFIED`: public workflow and authorization, persistence/read-back, failure cases and relevant tests have fresh evidence.
- `CODE COMPLETE / RUNTIME UNVERIFIED`: code exists but a real database/authenticated runtime test is unavailable.
- `BLOCKED`: a specific prerequisite or test failure prevents safe closure.
- `NOT STARTED`: no implementation yet.

This ledger is updated as code and fresh GitHub Actions evidence land; it is not itself proof of completion.


## Architectural refinement — strict domain separation without rebuilding ASLAN

**Decision recorded 2026-10-10:** The following domain visions refine the accepted ASLAN architecture. They are not authorization to restart the project, replace the current stack, or introduce premature infrastructure.

### Domain ownership and boundaries

| Domain | Owns | Must not own or mutate |
|---|---|---|
| Market / product commerce | Product catalog, categories, product media, stock reservation, cart, physical-product orders, delivery details, product invoices and payment references | Service-project lifecycle, course progress/admission, partner identity evidence |
| Services portal | Service catalog, customer requests, quotes/proforma offers, approvals, project milestones, change requests, BOQ/materials, appointments, service conversations, milestone payments, warranty/follow-up | Product cart/order state, academic enrollment/grades, partner due-diligence records |
| Academy / school network | Schools/branches, course catalog, admission screening, enrollments, curricula, modules/lessons, scheduled releases, assessments/attempts, learner groups, certificates, encyclopedias/editorial content, alumni | Product inventory/order lifecycle, service project workflow, partner payout/contract authority |
| Partners | Individual/company applications, KYC/KYB evidence, representatives, authority scopes, opportunities, negotiations/contracts, project links, revenue-share ledger and payout profiles | Direct ownership of market orders, student records or service requests; access is granted through explicit scoped contracts |
| ASLAN shared platform | Authentication, profile identity, RBAC/permissions, organization identity/membership primitives, locale preference, audit/event primitives, notification delivery, safe media-storage primitives and admin shell | Domain-specific business state or implicit cross-domain access |

### Integration contract

1. Preserve the existing Next.js App Router, TypeScript, Supabase/PostgreSQL, Supabase SSR, RBAC, RLS, existing tables and domain code. Do not duplicate shared identity, organizations, permissions, notifications, audit or billing primitives when an accepted implementation already exists.
2. Implement boundaries first as domain-owned modules, route/API namespaces, schema ownership, explicit service functions and permission checks. A domain may call another only through a narrow validated contract; it must not directly write another domain's tables as a shortcut.
3. Cross-domain references are identifiers plus explicit authorization/contract checks, not shared mutable business records. Examples: a service request can reference a customer identity; a partner opportunity may reference a project; neither grants access to the other domain's full record by itself.
4. Keep separate lifecycle state machines: physical-product checkout, service quote/project/milestone payments, academy admission/enrollment/learning progress, and partner contract/revenue/payout must not share one generic status field or trust a client-supplied payment-success flag.
5. Keep domain-specific private media access separate even when a shared storage helper is used. Product images intended for publication may be public; identity documents, signed agreements, learner submissions and private project blueprints require server-authorized access and expiring links.
6. Domain pages and APIs should be route-isolated now. Separate subdomains, deployables, databases, caches or microservices are future extraction options, not prerequisites for current correctness. Adopt them only when measured load, security boundaries, team ownership or availability requirements justify the operational cost.
7. Shared UI may preserve the ASLAN brand and account experience, but each portal gets its own navigation, dashboard, workflows and authorization scope. The Academy is a multi-school/branch platform with structured academic entities, not a single monolithic course component or one-file implementation.
8. Admin control is capability-based: editing branding, creating encyclopedia types, publishing courses, reviewing partner evidence, managing market products and approving service quotes must each map to explicit permissions and audit events. Super-admin access remains governed by the existing RBAC/RLS source of truth.
9. Public-facing domain aliases or subdomains may be mapped to these existing route boundaries later; do not change DNS, deployment settings, or Vercel as part of this workstream. GitHub Actions remains the verification route.
10. Acceptance is functional, not diagrammatic: test domain-owner reads/writes, cross-domain denial, transaction rollback, persistence/read-back, duplicate callbacks, private media access, state transitions and UI success/failure states. A successful build alone does not prove separation.

### Implementation order

- **Now:** close existing code/database/test blockers and wire each domain's actual user workflow using current infrastructure.
- **Next:** add negative cross-domain authorization tests and persistence/read-back checks to M43; ensure the same user identity does not imply cross-domain data access.
- **Later, only with evidence:** extract an independently deployable service/database for a domain, preserving explicit contracts and migration compatibility. Do not introduce Redis, a second database, WebSocket broker, video-transcoding vendor, blockchain certificate registry, or API gateway solely because they appear in a conceptual diagram; each needs a concrete implemented use case, operational ownership, cost justification and tests.

This refinement is additive to the existing M00–M43 architecture and does not redefine previously accepted milestones or authorize broad refactoring.
