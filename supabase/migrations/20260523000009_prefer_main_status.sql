-- 20260523000009_prefer_main_status.sql
-- Flip the priority introduced by migration 008. The Direct Mail Sheet's
-- Status column only carries one value in practice ("Order Sent") — it
-- tracks whether DM has been kicked off, not the workflow state. The
-- nuanced status ("Order Completed", "All Details Added", "Pending
-- Details", "All Details Added, Pending Details") lives in the Main
-- Order Sheet's first column, imported into `main_status`. Prefer that
-- and fall back to dm_status only when main_status is blank.

create or replace view public.orders_with_display_status
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
    when o.main_status is not null and o.main_status <> '' then o.main_status
    when o.dm_status is not null and o.dm_status <> '' then o.dm_status
    else 'Submitted'
  end as display_status
from public.orders o;
