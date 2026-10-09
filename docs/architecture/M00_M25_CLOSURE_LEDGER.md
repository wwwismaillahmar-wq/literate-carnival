# ASLAN M00–M25 Closure Ledger

**Snapshot date:** 2026-10-09  
**Branch under verification:** `chore/m00-m25-runtime-acceptance`  
**Snapshot commit:** `4a7a468ff2ac66e308a89a5bcb2f8faa8be9cfec`  
**Status rule:** a stage is not closed because code exists or CI passes. Closure requires the real workflow, authorization, persistence/read-back, failure path, regression evidence, and documentation. No Vercel deployment is authorized; work and verification are limited to GitHub repository/Actions.

## Build evidence

The combined branch passed GitHub Actions run [37922876862](https://github.com/wwwismaillahmar-wq/literate-carnival/actions/runs/37922876862):
- locked dependency installation: PASS
- ESLint: PASS
- TypeScript: PASS
- Next.js production build: PASS

This proves repository build quality only. It does **not** prove production database migrations, authenticated runtime workflows, payment provider operation, or deployment behavior.

A clean-database replay is configured in PR #22. Run [37925059334](https://github.com/wwwismaillahmar-wq/literate-carnival/actions/runs/37925059334) exposed `public.products` ordering; a guarded adjustment was made without changing the historical migration ID. The next run [37925762659](https://github.com/wwwismaillahmar-wq/literate-carnival/actions/runs/37925762659) then reached the social foundation migration and failed because `public.contributions` does not exist at `20261003231845_aslan_social_content_foundation.sql`. The DB container startup also emitted a Docker image rate-limit warning, but the fatal recorded SQL error is the missing relation. Migration replay and pgTAP remain **not passed**.

## Milestone status

| Stage | Domain / scope evidenced in the repository | Status | Remaining closure evidence |
|---|---|---|---|
| M00 | Master reference and project source of truth | PARTIAL | The authoritative master reference is not versioned in this repository as a tracked source file; align and track the accepted reference and change log. |
| M01 | Architecture / implementation baseline | PARTIAL | No complete M01 acceptance record was found in the repository; map the stage to its explicit scope and evidence. |
| M02 | Core Foundation contracts | LOCKED | The lock record exists and the current branch builds; preserve the Core boundary and regression-test dependent modules. |
| M03 | Identity, authentication, profiles, social features and messaging | PARTIAL | M03.3 registration has a lock record; login/profile/friends/posts/contributions/messages/attachments/realtime still need a current authenticated regression pass. |
| M04 | RBAC, organizations and admin authorization | PARTIAL | Existing RBAC/admin operations remain; product lifecycle fixes are merged into this branch and CI passes, but real authorized database acceptance is outstanding. |
| M05 | Security, environment, storage and configuration hardening | PARTIAL | Hardening migrations exist; verify applied state, negative authorization paths and storage limits against the target database before closure. |
| M06 | Database integrity and performance baseline | PARTIAL | Baseline migration exists; database-side constraint, index and query-plan acceptance has not been recorded here. |
| M07 | Stage definition not located in current repository docs | BLOCKED | Add the authoritative M07 scope and acceptance contract before claiming completion. |
| M08 | Events, idempotency, retry and recovery | PARTIAL | Migration and platform code exist; verify duplicate delivery, retry, recovery and worker execution against a real database. |
| M09 | Audit and company content | PARTIAL | Audit writer and company-content admin exist; verify every sensitive mutation is recorded and public content reflects saved changes. |
| M10 | Site settings and public brand assets | PARTIAL | Settings/brand-asset migrations exist; verify authorized edit, storage cleanup, and public-page reflection. |
| M11 | Content foundation / moderation dependencies | BLOCKED | No authoritative M11 schema migration source has been found in the currently reachable Git branches or commit search. Search historical PRs/backups before any replacement; do not fabricate an original. |
| M12 | Market: products, categories and leads | PARTIAL | Product mutation rollback and truthful read/audit reporting are implemented on this branch; actual create/edit/delete/media/public-reflection tests remain. |
| M13 | Inventory and fulfillment | PARTIAL | Routes, domain boundaries and migrations exist; test stock reservation, release, fulfillment transitions and failure recovery end to end. |
| M14 | Cart, checkout, orders and invoices | BLOCKED | The checkout hardening migration references carts/orders/order_items/inventory_items/inventory_movements/invoices but does not create them. No authoritative original M14 schema migration has been found in reachable branches/commit search. Recover the source or review a clearly labeled forward-recovery migration; do not claim historical restoration. |
| M15 | Billing and payments | PARTIAL | Payment configuration and initiation paths exist; no payment provider is considered verified until a real end-to-end payment lifecycle is tested. |
| M16 | Service catalog and service requests | PARTIAL | Catalog/request surfaces exist; verify request persistence, customer visibility, validation and authorization. |
| M17 | Service workflow, quotes, appointments and state machine | PARTIAL | State-transition and transaction migrations exist; test every allowed/denied transition and quote/appointment transaction against the database. |
| M18 | Notifications, support tickets and verified reviews | PARTIAL | Implementation and triggers are in the M18–M25 PR; test ownership isolation, ticket lifecycle, review eligibility and notification deduplication at runtime. |
| M19 | Communications administration | PARTIAL | Admin communications surface exists; verify all support/review mutations persist and notify the correct recipient. |
| M20 | Roles and permissions | PARTIAL | Existing RBAC remains authoritative and an M04 SQL test file exists; run positive and negative authorization tests before closure. |
| M21 | Database integrity and migration source of truth | BLOCKED | A clean replay currently fails at the first migration due to dependency ordering. M11/M14 schema sources are also unresolved; fresh-database replay and DB acceptance tests are blocked. |
| M22 | Security and operational controls | PARTIAL | RLS, storage and function hardening migrations exist; run unauthorized-user, owner-isolation and admin-only negative tests. |
| M23 | SEO: metadata, sitemap and robots | PARTIAL | SEO code is included and the build passes; verify generated sitemap/robots and public metadata from the deployed runtime before closure. |
| M24 | Consent-gated analytics and trusted conversion events | PARTIAL | Analytics code/triggers exist; test consent rejection, allowlisted events and trusted-only conversion events against real requests. |
| M25 | Documentation and acceptance | PARTIAL | This ledger and the M18–M25 scope record exist; final closure requires the blocked migration sources and runtime acceptance evidence to be resolved. |

## Changes verified on this branch in this pass

- Strengthened GitHub Actions with concurrency cancellation, locked installation, ESLint, TypeScript and production build.
- Fixed product-admin empty states so failed database reads are not presented as empty data or zero counts.
- Added rollback attempts when initial product-media upload or media-row registration fails during creation, with explicit rollback/cleanup errors.
- Kept successful product mutations visibly successful when audit logging fails, while showing a separate audit warning.
- Applied the same truthful failed-read reporting to company content, dashboard metrics and control-center counts.

## M26–M32 authoritative roadmap mapping

The accepted project source `00_ASLAN_MASTER_REFERENCE_v1.0.docx` establishes the platform domains and logical entities; the project roadmap snapshot `مراجعة دورية لمشروع ASLAN.txt` explicitly maps the next milestones as follows. This mapping is sourced from project references, not invented:

| Stage | Authoritative scope | Initial acceptance boundary |
|---|---|---|
| M26 | Search Platform | Search products/services/courses/content with validated filters, pagination, authorization-aware results, and database-backed integration tests. |
| M27 | Notifications / Communications | Persisted notification lifecycle, recipient isolation, delivery/retry/idempotency, and read/unread state. |
| M28 | Support / Complaints / Knowledge Base | Ticket/complaint creation, ownership, status lifecycle, attachments, admin handling, and knowledge-base publishing/access. |
| M29 | Analytics / Reporting | Trusted event ingestion, consent boundaries, accurate database-backed reports, date filters, and role-protected exports. |
| M30 | AI Platform | Server-only provider abstraction, validated requests, safe failure/fallback, quotas/audit, and no client-side secrets. |
| M31 | Recommendations / Intelligence | Explainable recommendations from authorized, consent-appropriate data with deterministic fallbacks and evaluation tests. |
| M32 | Admin Control Center | Unified role-protected operational dashboard for the domains above, truthful read failures, auditable mutations, and verified persistence. |

## Release gate

Do not mark M00–M25 fully closed and do not begin M26–M32 implementation until all M00–M25 rows have evidence for their required real workflows. The authoritative scope for M26–M32 is now recorded above, but their implementation remains gated. In particular, a green build is necessary but insufficient; the missing M11/M14 schema source or approved forward-recovery design, clean migration replay, pgTAP, and authenticated runtime acceptance remain blockers.
