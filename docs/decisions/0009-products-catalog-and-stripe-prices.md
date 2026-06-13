# 0009 — Products catalog + Stripe price model

## Status
Accepted (2026-06-05)

## Context
Invoice generation made the admin hand-type the DM rate, digital, and tech
amounts. Analysis of the real (live) Stripe invoice line items revealed a
finite, stable product catalog — mailers (per-piece), digital budgets, tech
add-ons, fees — each already a Stripe `price_id`, with prices that changed over
time (each rate is a new immutable Stripe price).

## Decision
- A **`products` catalog** table is the editable "pricing sheet" (`/admin/pricing`),
  one row per product mirroring a Stripe Product + Price.
- **Invoice lines use Stripe `price_id`s** for the mailer + tech lines
  (`pricing: { price }` + `quantity` in this SDK version) so invoices tie to real
  Stripe products. Digital/CC/discount stay computed amounts (too variable / no
  product). Hybrid fallback: when a row has no `price_id` or the rate is
  overridden, push a computed amount.
- **Editing a price creates a NEW Stripe price** (prices are immutable) and
  archives the old to `product_price_history` — preserving the rate-over-time
  trail.
- **Per-client defaults** are structured FKs (`default_mailer_product_id`,
  `default_tech_product_id`, existing `default_digital_budget`) that pre-fill the
  generate-invoice form.

## Consequences / constraints
- **Mode matters.** The derived `price_id`s are **live-mode**; the app currently
  runs a **test** key, so the seed stores `stripe_price_id = null` (live id kept
  in `notes`) and the system runs on **computed amounts** until valid ids exist.
  Populate `stripe_price_id` (or re-seed) under live keys to activate product lines.
- The restricted test key needs **`product_write` + `price_write` + `customer_write`**
  to create products/prices (pricing-sheet edits, new-client invoicing). Without
  them, edits that create a Stripe price will error; existing-customer invoicing
  on computed amounts still works.
