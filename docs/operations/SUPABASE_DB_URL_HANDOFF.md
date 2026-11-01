# ASLAN — Supabase direct connection secret (operator handoff)
Project: zyenfobyorjfwkdgeube
Database host: db.zyenfobyorjfwkdgeube.supabase.co
Port: 5432 (direct, IPv6 availability required from GitHub runner; verify connectivity before dump)
Database: postgres
Secret name: SUPABASE_DB_URL
Connection URI template (do not commit the filled value):
postgresql://postgres:<URL_ENCODED_DATABASE_PASSWORD>@db.zyenfobyorjfwkdgeube.supabase.co:5432/postgres?sslmode=verify-full

Security: obtain the actual connection string in Supabase Dashboard > Connect > Connection string > URI > Direct connection. Copy it privately into GitHub repository Settings > Secrets and variables > Actions > New repository secret. Do not paste passwords in chat, logs, commits, or issues. GitHub-hosted runners may lack IPv6 access; if direct DNS/connection fails, use a verified IPv4-compatible runner or approved Supabase session pooler, not an untested URL.

Acceptance gate:
1. GitHub Actions checks secret existence without displaying it.
2. Test TLS and SQL read-only from source, inventory all 117 user tables and per-table row counts.
3. Verify complete dump, including schema, data, extensions, ownership/roles considerations; do not claim full platform migration from SQL alone.
4. Restore in isolated PostgreSQL container on Contabo; compare identities and exact row counts.
5. Verify Auth/RLS/Storage/API compatibility separately before any cutover.
No changes to main, Supabase production, or Vercel production.
