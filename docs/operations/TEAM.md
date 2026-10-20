# ASLAN Technical Operations — Operating Charter
Status: development only. No production change authorized.

## Six accountable roles
1. Technical project manager: prioritize, assign, consolidate evidence and issue reports.
2. Infrastructure engineer: Contabo, Docker, deployment, TLS and network health.
3. Database engineer: PostgreSQL migration, integrity, recovery and reconciliation.
4. Application engineer: Next.js UI, API, auth, marketplace, academy and community.
5. QA engineer: automated acceptance tests and actual end-to-end verification.
6. Security and maintenance officer: secrets, least privilege, backups, alerts and incident response.

## Operating rules
- Management receives outcomes and decisions, not repeated copy/paste instructions.
- Never claim an AI role is running unless a real execution environment and credentials have been verified.
- Never print secrets, copy them into issues, or place them in GitHub Actions logs.
- No destructive DB commands, production cutover, DNS change, production deploy or removal of Supabase without explicit approval and tested rollback.
- Changes go through a development branch and a unified reviewed change set.
- Every claim of completion needs logs, tests and a reproducible verification result.
- Failures must be reported with evidence and next action, not hidden.
- Business departments operate independently from the website migration.

## Migration handoff
Known isolated target DB: aslan_migration. Backups on VPS: /root/aslan-backups/supabase-aslan.dump, aslan-public.dump, aslan-private.dump.
The restore is NOT completed. public.market_listing_submissions requires private.market_listing_payload_valid(jsonb,jsonb); private.is_super_admin depends on auth.uid(). Choose a compatible self-hosted service architecture before any cutover.
Do not source /root/aslan-secrets/supabase.env into a shell. Rotate any previously disclosed credentials safely.
