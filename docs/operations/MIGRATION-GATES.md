# Supabase → Contabo Migration: Evidence Gates
Current status: BLOCKED — backup created, restore and application cutover not verified.

## G0 Access and backups
Verify SSH/service account, backup archive readability, row counts and a tested recovery target. Protect credentials. Do not change production.

## G1 Architecture
Select and document either self-hosted Supabase-compatible services or independent PostgreSQL + replacement Auth/API/Storage. Existing Next.js package.json uses @supabase/ssr and @supabase/supabase-js; PostgreSQL alone is insufficient.

## G2 Database
Restore into an isolated DB. Resolve dependencies across auth/private/public/extensions. Compare source/target row counts, constraints, functions and sample records. Log evidence.

## G3 Auth and Storage
Verify login, password reset, super_admin permissions, file contents, bucket policies, expiring URLs, uploads and signed links. Do not assume database dump includes file objects.

## G4 Application acceptance
Verify market product create/edit/list, categories, academy files and assessments, community messages, partners and services. Record real API/database evidence.

## G5 Cutover approval
Before any production change: recent backups, differential sync or write freeze, rollback drill, management approval, documented DNS/environment plan.

## G6 Operations
Monitoring with real metrics, alerts, backup schedules, restore drills and daily incident report. A GitHub workflow is not a VPS monitoring agent.

## Completion rule
No gate is passed without evidence. Do not report migration complete until all gates pass.
