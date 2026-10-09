# ASLAN Admin Control Center — Implementation Status

This file records observed repository implementation, not intended or promised behavior.
Status vocabulary: **IMPLEMENTED**, **PARTIAL**, **PLANNED**, **BLOCKED**, **NOT IMPLEMENTED**.

| Module | Status | Repository evidence | Boundary / gap |
|---|---|---|---|
| Admin entry and session | IMPLEMENTED | `src/app/admin/page.tsx`, `src/app/admin/login/page.tsx` | Admin entry routes to login; protected pages perform server-side role checks. |
| Dashboard | PARTIAL | `src/app/admin/dashboard/page.tsx` | Live counts and recent rows exist; this is not a complete operational analytics system. |
| Admin navigation/control center | PARTIAL | `src/app/admin/control/page.tsx` | Links to current modules; authorization remains enforced by each protected page/action. |
| Users directory | IMPLEMENTED | `src/app/admin/users/page.tsx` | Reads profiles, assigned roles, and organization memberships. It does not expose Auth credentials or replace the existing access manager. |
| Roles and permissions | PARTIAL | `src/app/admin/access/page.tsx`, `src/app/admin/actions.ts` | Existing RBAC tables and management actions are used; no replacement RBAC model is introduced. |
| Organizations | PARTIAL | `src/app/admin/organizations/page.tsx`, `src/app/admin/actions.ts` | Existing organizations and memberships are managed; organization-scoped policies require separate regression evidence. |
| Content and featured records | PARTIAL | `src/app/admin/content/page.tsx`, `src/app/admin/actions.ts` | Existing posts, contributions, and featured-content records are surfaced. |
| Market / products / categories / leads | PARTIAL | `src/app/admin/market/page.tsx`, `src/app/admin/products/page.tsx`, `src/app/admin/categories/page.tsx` | Real catalog and lead management exist; end-to-end create/edit/upload acceptance must pass before calling product creation verified. |
| Services | PARTIAL | `src/app/admin/services/` | Catalog and operational surfaces exist; do not infer that the complete request-to-invoice workflow is closed. |
| Academy LMS | PLANNED | `src/app/academy/` public/account routes only | Full course authoring, lesson progression, assessments, and certificates are not established by this admin foundation. |
| Talent | PLANNED | No complete admin workflow established | Profiles, skills, verification, and professional evidence remain future activation work. |
| Partners | PLANNED | `src/app/partners/` | Partner ecosystem and company workflow are not established as a complete admin module. |
| Support / complaints | PARTIAL | Existing contact/community/message surfaces | Unified ticket lifecycle is not established. |
| Notifications | NOT IMPLEMENTED | No unified admin notification module established | Do not treat navigation or message records as a notification system. |
| Reports | IMPLEMENTED | `src/app/admin/reports/page.tsx` | Live row counts for existing tables; not revenue/finance analytics. Failed reads are shown as unavailable, not zero. |
| General settings index | PARTIAL | `src/app/admin/settings/page.tsx` | Links to existing payment settings, access, and audit. No generic settings storage is invented. |
| Payment settings | PARTIAL | `src/app/admin/payment-settings/page.tsx`, server action | Existing provider configuration only; no claim that a real payment provider has been end-to-end verified. |
| Audit | PARTIAL | `src/app/admin/audit/page.tsx`, `src/platform/audit/` | Reads recorded audit entries; coverage depends on individual operations. |
| Application/extension registry | IMPLEMENTED | `src/app/admin/applications.ts`, `src/app/admin/applications/page.tsx` | Static trusted-code registry with status and route; no dynamic JavaScript/plugin runtime. |
| Scientific/technology/programming encyclopedias | PLANNED | Registry entry only | No encyclopedia content or authoring workflow is claimed. |

## Security invariants

- Admin pages and server actions must verify the authenticated user and the existing `super_admin` role server-side.
- Existing Supabase RLS and M04 tables/functions remain authoritative; hiding a link is not authorization.
- Do not create duplicate role, permission, organization, or profile systems.
- Do not add production secrets to client bundles.
- Do not create future database tables until a concrete active workflow requires them.

## Verification rule

A module may be promoted from PARTIAL to IMPLEMENTED only after the relevant success path, invalid-input path, unauthorized-access path, persistence, and refreshed UI have been tested and evidence is recorded. A green build or deployment alone does not satisfy this rule.

## Change record

- 2026-10-09: Added a live-data user directory, live operational count reports, a truthful settings index, a static application registry page, and control-center/dashboard links. No database migration or production database mutation was included in these changes.
