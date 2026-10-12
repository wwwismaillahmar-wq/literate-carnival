# Academy operational continuation — 2026-10-12

Base: `ebb7fae8bf989759781f35b8bf41b4b950bf7364`.
Branch: `feat/academy-operational-completion`.

## Implemented behavior

- Student workspace at /account/academy: owned admission requests, invoices, enrollments, completed lessons, and assessment certificates.
- Public curriculum exposes metadata. Lesson bodies and resources require owned enrollment and ordered prerequisites, unless an administrator chooses open release.
- Assigned instructors can upload private video, PDF, PPTX, DOCX, image and text files (50 MiB per file), retry upload confirmation and archive/remove content. Published lessons and files require supervisory approval before changes.
- Admission invoice issuance is one database transaction with a per-admission unique index, server-side pricing and replay safety.
- Trusted payment settlement advances the matching admission atomically. The ambiguous admission status reference was corrected in an additive migration.
- Assessments require module completion; questions are graded on the server. Answer keys remain private and review/publication prevents teachers from directly changing approved content.
- Account-bound admission intake is enforced in the route and Data API policy. The browser Supabase client uses statically referenced public environment variables.
- Duplicate migration timestamp repaired by moving the payment/admission sync file to 20261011130100. Supabase local config and API/HTTP quality gates included.

## Fresh verification

| Check | Result |
| --- | --- |
| Clean migration replay in PGlite PostgreSQL 18.3 | 81 migrations |
| SQL/pgTAP behavior and existing regressions | 25 files, 308 assertions PASS |
| Real Next route handlers, Supabase transport replaced | 23 assertions PASS |
| Production-server anonymous HTTP access boundaries | 7 checks PASS |
| TypeScript | PASS |
| ESLint | PASS, existing warnings outside this slice |
| Next.js production build | PASS |
| git diff whitespace check | PASS |

Commands: `npm run test:academy:db`, `npm run test:academy:api`, `npx tsc --noEmit`, `ESLINT_USE_FLAT_CONFIG=false npm run lint`, `npm run build`, then `npm run test:academy:http`.

HTTP checks use placeholder Supabase settings and exercise unauthorized access and redirects. They do not simulate a signed-in Supabase user or real Storage bytes. SQL fixtures are rolled back and never write production data.

## Remaining release checks

- Run the repository's native Supabase/PostgreSQL 17 migration and pgTAP job in GitHub Actions; PGlite is a complementary isolated gate.
- Reconcile applied migration history before deploying: timestamp renaming must not create a mismatch with an already-applied production migration.
- Inspect existing admission invoices for duplicate source IDs or legacy source types before applying the unique index and source-type constraint.
- Test a real instructor upload, supervisor publication, accepted applicant payment, enrollment, sequential learning, grading and certificate verification against a controlled environment with Supabase Auth and Storage.
- Verify concurrent invoice/enrollment requests using separate PostgreSQL connections. Locks and uniqueness are present; the single-connection harness does not establish concurrency behavior.
- Existing certificates represent passed assessments. This slice does not claim a new whole-course graduation certificate, identity verification, reviewed translations, learner-group messaging, or closure of every site domain.

Course content, questions, prices and payment details remain authored through administration/instructor workflows. No production schema or main-branch deployment is changed by these local checks.
