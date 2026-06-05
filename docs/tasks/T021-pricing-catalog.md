# T021 — Products catalog, client pricing defaults, editable pricing sheet

## What
Turn invoicing from hand-typed amounts into an auto-built system driven by a
products catalog derived from the real Stripe data.

## Why
The live invoice line items map to a finite product set (mailers per-piece,
digital budgets, tech add-ons, fees), each a Stripe `price_id`. Capturing that as
an editable catalog + per-client defaults lets `generateInvoice` pre-fill and
push real Stripe products.

## Approach
- Migration `…17_pricing_catalog.sql`: `products` + `product_price_history`,
  `clients.default_mailer_product_id/default_tech_product_id`, admin-only RLS.
- `scripts/seed-products.ts` seeds the derived catalog (8 DM · 5 digital · 6 tech
  · 2 fee). Stripe price_ids are live-mode → seeded null, kept in `notes` (see ADR 0009).
- `lib/stripe/products.ts` (create product+price; create-new-price-on-edit),
  `lib/db/products.ts`, `lib/actions/products.ts`.
- `/admin/pricing` + `components/admin/PricingSheet.tsx` — the editable sheet.
- `components/admin/ClientPricingDefaultsForm.tsx` on `/admin/clients/[id]`.
- `generateInvoice` resolves the client's mailer/tech products → pushes
  `pricing:{price}`×qty when a usable price_id exists, else computed amount;
  the new-invoice form gained mailer + tech dropdowns.

## Files
New: the migration, `lib/stripe/products.ts`, `scripts/seed-products.ts`,
`lib/db/products.ts`, `lib/actions/products.ts`, `app/admin/pricing/page.tsx`,
`components/admin/PricingSheet.tsx`, `components/admin/ClientPricingDefaultsForm.tsx`,
ADR 0009. Edit: `lib/actions/invoices.ts`, `app/admin/invoices/new/page.tsx`,
`components/admin/GenerateInvoiceForm.tsx`, `app/admin/clients/[id]/page.tsx`,
`components/layout/AdminSidebar.tsx`, `types/db.ts`.

## Verification
- `tsc` + `lint` clean; migration applied; catalog seeded (21 products); new
  routes compile (307, no server errors).
- Stripe `pricing:{price}`×qty mechanic confirmed via the SDK type
  (`InvoiceItemCreateParams.pricing`). Full runtime price_id push is gated on
  live keys + key write permissions (ADR 0009).

## Follow-ups
- Grant the Stripe key `product_write`/`price_write`/`customer_write`, or run live
  keys, then populate `stripe_price_id`s to activate product lines.
- Optional: auto-suggest the mailer product from the order's class/mailer.
