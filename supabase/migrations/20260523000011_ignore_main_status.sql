-- 20260523000011_ignore_main_status.sql
-- The Main Order Sheet's "Added to Sheets" / first-column status is admin
-- bookkeeping ("Order Completed", "All Details Added") — it lags the real
-- workflow and the ops team works off the DM Sheet and Digital Jobs Sheet
-- statuses instead. Drop main_status entirely from the display fallback.
-- If neither dm_status nor digital_status is set, show 'Submitted'.

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
    else 'Submitted'
  end as display_status
from public.orders o;
