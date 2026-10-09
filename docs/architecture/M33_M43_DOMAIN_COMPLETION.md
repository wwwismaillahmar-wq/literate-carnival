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
