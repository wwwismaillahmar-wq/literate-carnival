# ASLAN-WEB-EXEC-2026-024 — Execution tracking

Status: IN PROGRESS — not accepted for production.

## Scope
1. GitHub automated maintenance channel: task intake, branch-only writes, checks, one PR.
2. Academy 50 MiB / 2 GiB / 8 GiB resumable upload with real-byte integrity verification.
3. Six locales ar, fr, en, es, de, pt with RTL/LTR and 8-space acceptance matrix.

## Baseline observations (2026-10-24)
- Repository: wwwismaillahmar-wq/literate-carnival.
- Existing scripts: typecheck, build, academy tests.
- Main layout hardcodes html lang=ar dir=rtl.
- Main Navbar contains hardcoded Arabic navigation labels.
- Main academy page contains hardcoded Arabic UI text.
- The expected upload rollout document was not found at docs/architecture/UPLOAD_8GIB_ROLLOUT.md; locate before modifying upload implementation.
- Main src/components/AcademyResumableUpload.tsx was not found; search other paths and branches.
- No 2 GiB or 8 GiB upload result has been established by this tracking document.

## Acceptance gates (all mandatory)
- Maintenance: real safe code edit, commit SHA, CI results and one PR; no direct production branch edits.
- Upload: real 50 MiB, 2 GiB, 8 GiB uploads, interrupted/resumed transfers, SHA-256 equality, unauthorized access rejection.
- I18n: all six locales across home, market, services, academy, partners, community, account and selected admin; persistence, errors, direction.
- Integration: auth, storage authorization, regressions, production build.
- No production merge/deploy without administration approval.

## Evidence register
| Gate | Status | Evidence |
|---|---|---|
| Branch created | verified | feat/aslan-web-exec-2026-024 |
| Safe write channel | pending demonstration | |
| Typecheck and build | not run | |
| 2 GiB / 8 GiB upload | not tested | |
| Six-locale end-to-end | not tested | |
| Unified PR | pending | |

Never label a gate complete without executable test evidence.
