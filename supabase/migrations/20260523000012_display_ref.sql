-- 20260523000012_display_ref.sql
-- Digital-only orders carry synthetic integer order_numbers (968..1085)
-- because the Digital Jobs sheet has no order-number column — the
-- importer minted them just to satisfy the NOT NULL UNIQUE constraint on
-- orders.order_number. That made them look like real DM orders in the UI.
--
-- Fix: add display_ref. DM orders keep null (UI falls back to
-- '#' || order_number). Digital-only orders get DIG-001, DIG-002, … so
-- the UI can show "Order DIG-001" and the route /orders/DIG-001 resolves.
-- The integer order_number stays in place to preserve UNIQUE + sort order.

alter table public.orders
  add column if not exists display_ref text unique;

create index if not exists orders_display_ref_idx
  on public.orders (display_ref);

update public.orders o
set display_ref = 'DIG-' || lpad(sub.rn::text, 3, '0')
from (
  select id, row_number() over (order by order_number) as rn
  from public.orders
  where needs_direct_mail = false and needs_digital = true
) sub
where o.id = sub.id
  and o.display_ref is null;

-- View needs to be re-expanded so display_ref shows up downstream.
-- CREATE OR REPLACE refuses to reorder columns (the new o.* expands
-- display_ref into the slot the old display_status occupied), so drop
-- and recreate.
drop view if exists public.orders_with_display_status;
create view public.orders_with_display_status
with (security_invoker = true) as
select
  o.*,
  case
    when exists (
      select 1 from public.proofs p
      where p.order_id = o.id and p.status = 'pending'
    ) then 'Awaiting Your Approval'
    when exists (
      select 1 from public.proofs p
      where p.order_id = o.id and p.status = 'revision_requested'
    ) then 'Revision Requested'
    when o.dm_status is not null and o.dm_status <> '' then o.dm_status
    when o.digital_status is not null and o.digital_status <> '' then o.digital_status
    else 'Submitted'
  end as display_status
from public.orders o;
