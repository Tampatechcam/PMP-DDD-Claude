-- 20260604000015_invoices_stripe_and_client_read.sql
--
-- Phase 3 — client invoice generation via Stripe Invoicing.
--
-- 1. Map each PMP client to a Stripe Customer (created lazily on first invoice).
-- 2. Turn the invoices table into a synced mirror of the Stripe invoice:
--    keep the existing numeric breakdown columns (we still compute + display
--    them) and add the Stripe identifiers / hosted URLs we surface in the
--    portal. Status + paid date are owned by the Stripe webhook.
-- 3. Let a client READ invoices for their own orders. This reverses the v1
--    "admin-only" stance (ADR 0004) — see ADR 0008. Admin write stays admin-only
--    via the existing invoices_admin_only (for all) policy; Postgres ORs the
--    SELECT policies so this is purely additive.

alter table public.clients
  add column if not exists stripe_customer_id text;

alter table public.invoices
  add column if not exists stripe_invoice_id   text,
  add column if not exists hosted_invoice_url  text,
  add column if not exists invoice_pdf_url     text,
  add column if not exists stripe_status       text;

-- One Stripe invoice per local row.
create unique index if not exists invoices_stripe_invoice_id_key
  on public.invoices (stripe_invoice_id)
  where stripe_invoice_id is not null;

-- Client read of their own invoices (mirrors order_events_select).
drop policy if exists invoices_client_select on public.invoices;
create policy invoices_client_select on public.invoices for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = invoices.order_id
        and (o.client_id = public.current_client_id() or public.is_admin())
    )
  );
