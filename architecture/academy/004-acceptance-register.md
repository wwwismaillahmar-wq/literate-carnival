# ASLAN-ACADEMY-UNIFIED-004 — acceptance register

**Source of truth:** user-supplied `ASLAN_ACADEMY_UNIFIED_REQUIREMENTS_004.pdf` (7 pages, 17 numbered sections), dated 14 October 2026. The user's earlier conversational 70-article expanded specification is a distinct source; do not falsely claim that the PDF itself contains 70 numbered articles.
**Scope:** development branch only. This register is NOT a declaration of acceptance.
**Evidence rule:** a feature is complete only when code, schema, permissions, user journey, automated tests, and production-equivalent acceptance tests have passed.

| Chapter | Requirement area | Current verification | Blocking acceptance evidence |
|---|---|---|---|
| 01 | Definition and objectives | NOT VERIFIED | Trace each approved article to tested user journey |
| 02 | Educational architecture | PARTIAL | Course/module/lesson CRUD and role tests |
| 03 | Lesson design | PARTIAL | Authoring + student rendering and accessibility |
| 04 | Progressive production | PARTIAL | Production buffer, approvals, release calendar |
| 05 | Admissions and individual pathway | NOT VERIFIED | Enrollment/payment/access workflow |
| 06 | Lesson availability | PARTIAL | Server-authoritative release and mastery gates |
| 07 | Assessments | PARTIAL | Versioning, grading, attempts, retakes, audit |
| 08 | Formats and attachments | PARTIAL | Format matrix and content processing by MIME |
| 09 | Large video/files | BLOCKED | Real 2/4/8 GiB resumable tests; bucket currently 50 MiB |
| 10 | Practical work/simulation | NOT VERIFIED | Instructor rubric and evidence review |
| 11 | Dashboards and permissions | PARTIAL | Student/teacher/admin E2E authorization |
| 12 | Production and updates | PARTIAL | QA, review, change history, publication gates |
| 13 | Technology and security | BLOCKED | Migrations, storage policies, scanning, audit, threat tests |
| 14 | Metrics and reporting | NOT VERIFIED | Reports and verified analytics |
| 15 | Acceptance tests | BLOCKED | Full matrix and signed results |
| 16 | Delivery | BLOCKED | Build, migration dry run, E2E, rollback and signoff |
| 17 | Responsibilities | NOT VERIFIED | Role approvals and operating procedures |

## Implementation evidence on this branch

- `src/lib/academy/mastery-policy.ts`: pure mastery evaluator, **not yet integrated** with trusted assessment records.
- `src/lib/academy/resource-policy.ts`: metadata format and 8 GiB **planned** limit, not a storage guarantee.
- `src/app/api/academy/upload-intent/route.ts`: authenticated pending upload intent; currently enforces **50 MiB**.
- `src/components/admin/AcademyResumableUpload.tsx`: browser TUS direct upload, pause/retry/resume. **Not yet E2E tested**.
- `src/app/api/academy/upload-complete/route.ts`: storage existence/size check and pending-to-uploaded transition.
- `src/app/api/academy/assets-review/route.ts`: review queue and rejection. Approval intentionally disabled until verified content/security scan.
- `architecture/academy/004-foundation.sql` and `005-storage-upload-policies.sql`: migration proposals **not applied**.
- `tests/academy/mastery-policy.test.cjs`: unit tests committed; CI execution not evidenced.

## Mandatory release blockers

1. Trace all **17 numbered sections** of the located source PDF and reconcile the expanded **70-article conversational specification** without inventing article text.
2. Validate migrations against actual database constraints and apply only with controlled authorization.
3. Resolve the provider's storage plan and bucket caps; test interrupted transfers with actual 2/4/8 GiB files.
4. Implement authenticated malware/content scanning and independent approval before setting asset status to `ready`.
5. Complete student/teacher/admin journeys, enrollment, progress, mastery, assessments, practical grading, certificates, metrics and multilingual UX.
6. Execute `npm run typecheck`, `npm run test:academy`, `npm run build`, and authenticated E2E/permission tests. Fix every failure.
7. Preserve the user's final approval before production deployment.

**Do not represent the Academy as 100% ready while any blocker remains.**

## Primary source located

`ASLAN_ACADEMY_UNIFIED_REQUIREMENTS_004.pdf` is available among the user's Project/Library files and has been read in full. It specifies 17 numbered sections across seven pages. The previous statement that the source was unavailable was incorrect. Actual end-to-end tests are deferred by the user until after deployment; this does not turn unverified features into passed acceptance criteria.
