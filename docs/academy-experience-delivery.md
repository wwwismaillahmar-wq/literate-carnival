# Academy experience and site guides
## User journeys
- /academy: training field portals, searchable published-course gallery, editorial information, and optional administrative announcements/promotions.
- /academy/join?course=ID: explicit course selection, course summary and detail links, authentication return path, available school/branch selection, qualification questions, consent, admission submission, and tracking.
- /: real published courses and training portals. Marking a course featured changes its priority; it does not publish a draft.
- /guides, /guides/management, /guides/rules: user instructions, all 15 seeded role responsibilities and boundaries, respect/privacy/trading rules, and complaints.
- /account/authorization: actual role/permission context with Arabic explanations and role guide links.

## Administrative content
Use /admin/site-settings as super_admin to edit academy hero, announcements, promotion copy and internal destination, three informational cards, course classification/HTTPS cover, and featured selection. Existing courses remain the source of titles, prices, publication and curriculum. Metadata uses the existing public site_settings table; this UI package adds no database migration. Empty announcement/promotion bodies hide those sections.

Roles in the guide describe responsibilities, not access grants. Administrative gates remain enforced by their existing authorization; instructor workspace requires active course assignment. The patch also removes selection of the nonexistent courses.name column in the instructor page.

## Verification
- node scripts/test-academy-experience.mjs: catalog behavior, metadata/link validation, complete role coverage, and site-settings update authorization/origin/atomic validation.
- npm run test:academy:api: operational API regression acceptance.
- npm run lint, npx tsc --noEmit, npm run build.
- Optional fixture-only browser journey, without production database writes:
  - Install playwright@1.58.2 and Chromium in an isolated temporary prefix; set ASLAN_PLAYWRIGHT_MODULE to that prefix module.
  - Build with NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3201 and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ci_placeholder.
  - Run node scripts/test-academy-experience-browser.mjs; it owns its temporary mock database and Next server and shuts them down.
  - Covers desktop/mobile gallery, filtering/reset, field portals, course detail/selection, homepage section, guides, guest return path, question-load failure/retry, authenticated request/tracking and catalogue failure.

## Release boundary
This delivery incorporates the operational academy package from d940008. Preview deployment does not apply migrations to production Supabase. Private lesson assets, sequential lesson access, and atomic admission billing require the operational migration from that package before full live acceptance. No production database migration, fabricated course, financial transaction, main merge, or production promotion is performed by this UI delivery.
