# ASLAN market delivery
The market supports ASLAN products and separately reviewed partner storefronts. /products remains a query-preserving redirect; product detail URLs remain stable.

## Journeys
- /market: category portals, product gallery, price/store/availability/text filters, ordering, favourites and comparison on the current device.
- /market/stores and /market/stores/SLUG: approved stores with scoped product catalogues.
- /products/SLUG: photos/thumbnails/videos/documents, actual price, minimum quantity, stock, declared specifications, approved reviews, related products, cart or quote paths.
- /cart, /checkout, /orders: named products, quantity changes/removal, current totals, delivery data and existing order/invoice flow.
- /market/quote and /market/requests: wholesale/custom/availability inquiries, customer consent, responsible-store routing and private response tracking.
- /market/sell: authenticated store application, admin approval, real photo upload (JPEG/PNG/WebP, 3MB per image), listing review requests, inquiries and scoped product-order delivery fields.
- /admin/market/partners: super_admin store approvals/suspension and atomic listing approval/publication/inventory setup.

## Database boundary
Migration 20261012121623_market_partner_stores.sql adds RLS-backed stores, private listing submissions and private quotes; public media bucket with per-owner/approved-store upload rules; admin-only invoker listing publication; own-cart mutation with current prices and quantity validation; minimum quantity guards; a tightly scoped seller order projection. No commissions, settlement rate, merchant verification guarantee, delivery promise, fake rating or fabricated product is introduced.

The marketplace keeps the existing centralized checkout/invoice/payment workflow. Seller order access reveals their own product lines and necessary delivery fields, never other sellers' lines or payment credentials. Seller suspension deactivates their published products. Reapproval does not silently republish deactivated products.

## Validation commands
- node scripts/test-market.mjs
- node scripts/test-academy-db.mjs (isolated PostgreSQL/pgTAP)
- ESLINT_USE_FLAT_CONFIG=false npm run lint
- NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3301 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ci_placeholder npm run build
- ASLAN_PLAYWRIGHT_MODULE=/tmp/aslan-browser/node_modules/playwright node scripts/test-market-browser.mjs (isolated fixture REST server and owned temporary Next server)
- GitHub quality gate replays all migrations and tests using native Supabase PostgreSQL.

Browser fixtures are never written to production. Real merchants and products remain under administrative review before public display. Payment availability continues to depend on configured payment providers; this package does not enable or invent provider credentials.
