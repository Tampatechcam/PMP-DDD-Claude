-- 20260604000016_client_billing_email.sql
--
-- Stripe requires a customer email to create a send_invoice invoice, but the
-- data has none reliably (0/53 offices carry a contact email; 1/40 clients has
-- a linked user account). Store a billing email per client: the admin enters it
-- once on the generate-invoice form, it's reused on the client's later invoices,
-- and it's pushed to the Stripe Customer. We never email from Stripe (portal-only
-- delivery, ADR 0008) — this just satisfies Stripe's requirement and records the
-- billing contact.

alter table public.clients
  add column if not exists billing_email text;
