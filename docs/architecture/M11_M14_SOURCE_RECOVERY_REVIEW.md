# M11 / M14 Migration Source Recovery Review

**Date:** 2026-10-09  
**Repository:** `wwwismaillahmar-wq/literate-carnival`  
**Purpose:** Record source recovery findings and define the safety gate before proposing an independent recovery migration.

## Decision

**Original schema source not recovered. Do not claim M11/M14 restoration. Do not apply a guessed schema to production.**

Searches of reachable repository code, migration files, branches, and commit/PR search did not identify authoritative `CREATE TABLE` definitions for the missing `public.contributions` relation or the checkout domain relations used by the M14/M13 hardening migration. The current migration `20261008131500_m14_m13_atomic_checkout_inventory_invoice_hardening.sql` alters `public.orders` and calls checkout logic over `carts`, `cart_items`, `orders`, `order_items`, `inventory_items`, `inventory_movements`, and `invoices`; it does not establish their original schemas.

## Evidence

- [Failed clean replay: run 37925762659](https://github.com/wwwismaillahmar-wq/literate-carnival/actions/runs/37925762659): `20261003231845_aslan_social_content_foundation.sql` fails at `ALTER TABLE public.contributions` because the relation does not exist.
- [Prior clean replay: run 37925059334](https://github.com/wwwismaillahmar-wq/literate-carnival/actions/runs/37925059334): historical catalog migration previously failed because `public.products` had not yet been created.
- [Existing M14/M13 hardening migration](https://github.com/wwwismaillahmar-wq/literate-carnival/blob/chore/m00-m25-runtime-acceptance/supabase/migrations/20261008131500_m14_m13_atomic_checkout_inventory_invoice_hardening.sql).
- [Current M00–M25 closure ledger](./M00_M25_CLOSURE_LEDGER.md).

## Production-history safety constraints

1. Do not rename migration files or rewrite migration version IDs to make history appear clean.
2. Do not access or mutate the production database as part of this review.
3. Do not present a newly designed schema as the original historical source.
4. Any future forward-recovery migration must be clearly named and separately reviewed. Before approval, compare its columns, constraints, enum values, foreign keys, RLS policies, grants, triggers, indexes, RPC signatures, and app queries against versioned application contracts and any authoritative backups/export the owner supplies.
5. Test that migration against a fresh local database and add regression tests for existing installations. A clean replay alone is insufficient to prove compatibility with production migration history.
6. Never deploy through Vercel. All code and test evidence must remain in the GitHub repository and GitHub Actions.

## Required next steps

- Continue searching any owner-controlled backup/archive or historical repository unavailable to the current GitHub connection for original M11/M14 SQL.
- If original source cannot be recovered, prepare a separately named recovery design and review its compatibility; do not silently patch in assumed columns.
- Make the empty-database migration chain complete and idempotent where appropriate; run pgTAP only after the complete replay passes.
- Add authenticated end-to-end route tests for authorization, create/update/delete, persisted read-back, media upload/metadata registration/cleanup failure, cart/checkout/order/invoice/payment, insufficient inventory, invalid input, duplicate/retry/idempotency and unauthorized access.
- Re-run locked install, ESLint, TypeScript, production build, empty replay, pgTAP, and route acceptance on the final commit. Attach run IDs and logs to the ledger.
- Keep M00–M25 open until every required gate passes. Do not invent M26–M32 scope; source it from the accepted master roadmap first.
