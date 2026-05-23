-- 20260523000008_dm_status_first.sql
-- Surface the Direct Mail Sheet status raw on the orders list. The old
-- translation collapsed every dm_status into one of four generic strings
-- ('In Production', 'Ready to Send', 'Completed', etc.), which lost the
-- nuance the ops team actually uses ("Pending Details", "All Details
-- Added, Pending Details", "Order Sent", ...).
--
-- Display priority:
--   1. If a proof is pending the client's decision, that overrides
--      everything for THIS audience — clients see "Awaiting Your Approval".
--   2. Same for an outstanding revision request.
--   3. Otherwise prefer dm_status verbatim (the Direct Mail Sheet's value).
--   4. Then main_status verbatim.
--   5. Fall back to 'Submitted'.

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
    when o.main_status is not null and o.main_status <> '' then o.main_status
    else 'Submitted'
  end as display_status
from public.orders o;
