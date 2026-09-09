# ASLAN MODELLING — Production Foundation

Production-oriented Next.js foundation for ASLAN MODELLING.

## Architecture

- Next.js App Router
- Supabase SSR (`@supabase/ssr`)
- Supabase Postgres + RLS
- Vercel deployment target
- WhatsApp lead conversion flow
- Admin authentication via Supabase Auth

## Important

The production Supabase project already contains `products`, `courses`, `enrollments`, `leads`, `orders`, and `partners`. The migration in `supabase/migrations/20260908070000_aslan_core_security_and_catalog.sql` is intentionally additive and aligns the application with that existing schema.

The old conflicting schema was moved to `supabase/legacy/001_initial_legacy.sql` for reference only. It must not be applied to the production project.

## Environment

Set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never put a Supabase service-role/secret key in client-side code.

## Verification status

- Supabase migration: applied and verified against the live project.
- RLS policies: applied and verified.
- Existing admin account: marked with `app_metadata.role = admin`.
- Local `npm install` could not complete in the current sandbox because package registry access timed out; therefore a production build has **not** been claimed as passed.
- GitHub write access is still blocked by the connected GitHub integration; no repository files have been falsely claimed as committed.
