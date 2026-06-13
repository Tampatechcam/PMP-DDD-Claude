# 0008 — Invoices via Stripe Invoicing; clients can view their own

**Status:** Accepted · 2026-06-04 · supersedes the invoice stance in [0004]

## Context

The `invoices` table + admin list/detail shipped in v1 but nothing created
rows, and ADR 0004 / Part 16 kept invoices admin-only. Phase 3 needs real
client invoicing: a generated invoice, a way for clients to pay, a PDF, and
accurate paid-status tracking. Building a bespoke PDF renderer + payment
integration + reconciliation is a large surface to own.

## Decision

Integrate **Stripe Invoicing** and let clients **view + pay** their own
invoices.

- **Stripe owns** the PDF, the hosted card-payment page, and the source of
  truth for payment status (via webhook). Our `invoices` table becomes a
  **mirror**: we keep the computed line-item breakdown for display and store
  the Stripe id + hosted/PDF URLs + status.
- **We compute** line items (DM = rate × `mailing_quantity`, digital, tech,
  CC processing = 3% of subtotal) so the admin gets a live preview and we
  retain a breakdown; the math lives once in `lib/invoices/compute.ts`,
  reused by the form and the server action.
- **Tax:** a manual 7% Stripe `TaxRate` ("FL Sales Tax"), applied to the
  **DM line only** and **only when the order's office state is `FL`**
  (printed mailers = taxable tangible goods). Created once by
  `scripts/stripe-setup.ts`.
- **Delivery is portal-only:** we `finalizeInvoice` but never `sendInvoice`,
  so Stripe issues a payable hosted URL + PDF without emailing anyone. The
  client portal surfaces "Pay invoice" + "Download PDF".
- **Visibility:** a new RLS policy (`invoices_client_select`, migration 015)
  lets a client SELECT invoices for their own orders, mirroring
  `order_events_select`. Admin write stays admin-only.

## Consequences

- No headless-Chromium/PDF dependency to maintain; Stripe handles rendering,
  dunning UI, and payment-method support.
- Payment status is asynchronous — the webhook (`/api/stripe/webhook`) flips
  the row to Paid. The admin UI has no manual "mark paid".
- A Stripe Customer is created lazily per client (`clients.stripe_customer_id`).
- Reverses ADR 0004's admin-only invoice stance.

## Alternatives considered

- **Bespoke `@react-pdf/renderer` + manual payment tracking.** Rejected:
  reinvents payments, PDF, and reminders; no real card collection.
- **Stripe Tax (automatic).** Rejected for now: paid add-on + tax-registration
  setup, and may not equal the flat 7%-FL rule Cam specified.
