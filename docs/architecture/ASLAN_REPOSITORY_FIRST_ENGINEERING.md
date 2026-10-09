# ASLAN Repository-First Engineering Architecture

## Authority and order of work

**GitHub is the engineering source of truth.** Architecture, module contracts, implementation, migrations, tests, review evidence, and task status live in this repository. Vercel is a downstream build/deployment target. Supabase is the application data/auth/storage service; it is not a substitute for repository design or verification.

Required order for every task:

1. Identify the owning module, existing contract, dependencies, and acceptance criteria in this repository.
2. Implement the smallest coherent change on a dedicated branch. Do not patch `main` directly for feature work.
3. Add or update tests for the behavior and the failure path.
4. Run the repository quality gate (TypeScript + production build, and relevant domain/database tests).
5. Review the complete diff against the acceptance criteria and check adjacent modules for regressions.
6. Merge only after the evidence is recorded.
7. Use Vercel after repository checks pass; verify deployment identity/status separately from functional acceptance.
8. Use Supabase only when the task concerns schema, data, auth, RLS, storage, or runtime integration. Database changes must have a versioned migration and a reproducible test.

A green deployment proves that a deployment completed; it does not prove that a user journey works.

## Current repository inventory

Inventory captured from the Git tree on 2026-10-09:

- Next.js App Router application under `src/app/`.
- 47 `page.tsx` route pages, including 19 administration pages.
- 14 API route handlers under `src/app/api/`.
- 22 component files/directories under `src/components/`.
- 36 Core files/directories under `src/core/`.
- 37 versioned SQL migrations under `supabase/migrations/`.
- One database test file currently present: `supabase/tests/database/m04_authorization.sql`.
- Four existing architecture/lock documents under `docs/architecture/`.
- No GitHub Actions workflow existed in `.github/workflows/` at the time of this inventory.

This inventory describes repository structure only; route/file presence is not proof that its feature is complete.

## Layer ownership

### Application entry points — `src/app/`
Own route composition, request handling, page presentation, and route-specific UI. Keep business rules out of large page components when they can live in a domain action/service with a testable contract.

### Reusable UI — `src/components/`
Own reusable presentation and interaction components. Components should expose explicit props/callbacks and render operation outcomes; they must not silently swallow failures.

### Core contracts — `src/core/`
The domain-neutral contracts already described by `M02_CORE_FOUNDATION.md`: shared IDs/time, Result/CoreError, configuration, identity and authorization references, organization references, security policy, events, audit, integration, idempotency, and state transitions. Core must not become a second implementation of commerce, services, academy, partners, or other business domains.

### Application adapters — `src/lib/`
Current integration boundary for Supabase clients, authorization/configuration, shared data access, and application types. Do not duplicate these adapters in individual routes. Move responsibilities only through a verified migration, not a mass rewrite.

### Database and infrastructure contracts — `supabase/migrations/`, `supabase/tests/`
Every schema, function, policy, storage, or permission change must be versioned. Security-definer functions require a documented execution boundary and least-privilege grants. RLS changes need positive and negative tests. A migration file existing in Git does not prove it has been applied to the live project.

### Architecture decisions — `docs/architecture/`
The canonical record for module boundaries, accepted decisions, lock status, and verification evidence. Update the relevant decision record when behavior or ownership changes.

## Module contract required for each task

Every task/change must identify:

- **Module and scope:** the module being changed and explicitly excluded modules.
- **Owner paths:** the files permitted to change.
- **Inputs/outputs:** action/API contracts, data shapes, errors, and state transitions.
- **Dependencies:** Core contracts, domain services, Supabase schema/policies, and other modules.
- **Acceptance tests:** success path, validation path, permission denial, persistence, and UI-visible result as applicable.
- **Verification:** exact commands/results, relevant test evidence, diff review, and deployment identity if deployed.
- **Closure:** merge SHA, what passed, what did not pass, and known residual risks.

No task is closed on the basis of code being written, a commit existing, or a deployment becoming READY alone.

## Pull-request and change rules

- Keep each branch focused on one coherent task; use names such as `fix/products-create-upload` or `feature/academy-course-management`.
- Avoid concurrent writes to the same file and avoid multiple workers editing shared ownership areas without an agreed boundary.
- Do not mix unrelated architecture, UI, database, and deployment changes in one commit.
- Never commit credentials, production data, generated secrets, or environment files.
- Never weaken RLS or authorization simply to make a test pass.
- Preserve existing routes and behavior unless the task explicitly replaces them and provides migration/acceptance evidence.
- Review the full diff before merge; test failure means the task remains open.

## Current engineering risks to resolve through repository work

1. Introduce repository-hosted CI for repeatable TypeScript and production-build gates.
2. Expand automated tests beyond the single current database authorization test.
3. Build an explicit module/task register with ownership, dependencies, status, and acceptance evidence.
4. Audit administration flows as end-to-end capabilities (form -> server action/API -> persistence -> storage -> refreshed UI), rather than testing buttons in isolation.
5. Add security regression coverage for authorization helpers, RLS policies, storage access, and role boundaries.

These are engineering priorities, not claims that the features are already implemented.
