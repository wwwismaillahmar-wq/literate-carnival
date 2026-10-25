# ASLAN internationalization contract (024)

## Standards
Use BCP 47 locale identifiers (ar, fr, en, es, de, pt), Unicode CLDR plural/date/number rules via Intl, and ICU MessageFormat for variable and pluralized UI messages. The current repository does not yet include a MessageFormat runtime; do not claim ICU rendering until one is installed and integrated. The shared locale contract is in src/lib/i18n/core.ts.

## Architecture
- UI messages: namespaced catalogs by domain (common, market, services, academy, partners, company, community, talent, admin). No hardcoded interface text in JSX. Each key must be present in all six locales.
- Language state: one canonical localStorage key and custom event; storage event for cross-tab updates; html lang/dir always match current locale. Later add SSR cookie synchronization to avoid first-paint language mismatch.
- Missing keys: fail CI for missing or blank keys, placeholder mismatches, and unexpected untranslated Arabic UI strings in non-Arabic pages; runtime diagnostic warning is only a temporary safety net.
- Content authored by administrators: separate from UI dictionaries. Store content locale variants in a database relation with fields content_type, content_id, locale, field_name, value, review_status, updated_at, and reviewer. Enforce unique(content_type,content_id,locale,field_name), authorization and audit; never overwrite original-language content. Translation publication requires editorial approval.
- User-generated content: display in authored language by default; translation optional and explicitly labelled.
- Browser acceptance: verify every visible heading, action, form, validation, empty/loading/error state in each public space; verify actual route transitions, RTL/LTR, persistence after refresh and across tabs, and hydration behavior.
- Production: no merge/deploy before locale coverage and acceptance tests are proven and management approves.

## Migration
1. Centralize locale selection and synchronization (in progress).
2. Migrate domain dictionaries and all interface strings, with a complete key matrix.
3. Add content translation schema/API/editorial workflow in a separate reviewed migration.
4. Integrate ICU formatting runtime, Intl formatting and server cookie locale handling.
5. Run full browser acceptance and resolve every missing translation.
