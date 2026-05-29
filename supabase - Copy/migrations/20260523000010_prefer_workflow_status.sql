-- 20260523000010_prefer_workflow_status.sql
-- The Main Order Sheet's first-column status ("Order Completed", "All
-- Details Added", "Pending Details") is admin-level and lags the actual
-- workflow. The DM Sheet and Digital Jobs Sheet carry the live state ops
-- works against — "Order Sent", "Campaign Completed", etc.
--
-- Flip the priority so the display surfaces the workflow sheet first.
-- If the order has both DM and digital and they disagree, prefer DM
-- since the DM workflow is usually the longer pole.

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
    when o.dm_status is not null and o.dm_status <> '' then o.dm_status
    when o.digital_status is not null and o.digital_status <> '' then o.digital_status
    when o.main_status is not null and o.main_status <> '' then o.main_status
    else 'Submitted'
  end as display_status
from public.orders o;
