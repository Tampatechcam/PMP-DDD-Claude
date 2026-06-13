# T020 — Client invoice generation via Stripe Invoicing

**Branch:** `feature/invoicing` · **ADR:** [0008](../decisions/0008-stripe-invoicing-and-client-visibility.md)

## What

Admins generate an invoice from an order; the client views + pays it from the
portal. Stripe Invoicing renders the PDF, hosts the payment page, and webhooks
paid status back. Our `invoices` table mirrors the Stripe invoice.

## Why

The invoices table + admin views existed but nothing created rows, and clients
couldn't see invoices (ADR 0004). Phase 3 needed real billing + payment.

## Approach

- **Compute once:** `lib/invoices/compute.ts` — DM total (rate × qty), digital,
  tech, CC = 3% of subtotal. Reused by the admin form (live preview) and the
  server action (authoritative). Stripe computes the final tax + total.
- **Tax/fees:** manual 7% Stripe `TaxRate` on the DM line, FL offices only;
  CC processing as an explicit line item.
- **Generate:** `generateInvoice` (server action) ensures a Stripe Customer,
  creates invoice items, creates + **finalizes** the invoice (no `sendInvoice`
  → no email), and mirrors the result locally.
- **Pay status:** `/api/stripe/webhook` (signature-verified, service-role)
  flips the row to Paid on `invoice.paid`, etc.
- **Visibility:** migration 015 adds `invoices_client_select` RLS + the Stripe
  mirror columns + `clients.stripe_customer_id`.

## Files

- New: migration `20260604000015_invoices_stripe_and_client_read.sql`;
  `lib/stripe/server.ts`; `lib/invoices/compute.ts`; `lib/actions/invoices.ts`;
  `scripts/stripe-setup.ts`; `app/api/stripe/webhook/route.ts`;
  `app/admin/invoices/new/page.tsx`; `components/admin/GenerateInvoiceForm.tsx`;
  `app/(client)/invoices/page.tsx`; `app/(client)/invoices/[id]/page.tsx`.
- Edit: `lib/db/invoices.ts`; `app/admin/invoices/[id]/page.tsx`;
  `app/admin/orders/[order_number]/page.tsx`; `components/layout/ClientSidebar.tsx`;
  `.env.example`; `package.json` (+ `stripe`); `types/db.ts` (regen).

## Assumptions / follow-ups

- FL 7% base = **DM line only** (vs. full subtotal) — confirm with Cam.
- No client email is stored on `clients`; the Stripe Customer is name-only.
  Add an email later if Stripe receipts are wanted.
- No manual "mark paid" — payment status is webhook-owned by design.

## Verification

See plan file `robust-sauteeing-spring.md`. Local: set `STRIPE_SECRET_KEY`,
run `scripts/stripe-setup.ts`, `stripe listen --forward-to
localhost:3000/api/stripe/webhook`, generate for an FL vs non-FL order, pay
with `4242…`, confirm the webhook flips status to Paid.
