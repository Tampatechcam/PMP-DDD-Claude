-- 20260523000007_view_rls_and_backfill.sql
-- Two corrections to migrations 002 and 005:
--   1. The display + self views were created without security_invoker.
--      On PG15+, that means they run as the view owner and bypass RLS — a
--      client could `select * from orders_with_display_status` and see
--      every row in the system. Recreate them with security_invoker = true
--      so RLS on the underlying `orders` / `clients` tables applies.
--   2. The handle_new_user trigger didn't backfill profiles for the demo
--      users we already created (and could miss any user created via
--      auth.admin.createUser if the trigger races). Add a defensive
--      backfill so every auth.users row has a matching profiles row.

create or replace view public.orders_with_display_status
with (security_invoker = true) as
select
  o.*,
  case
    when o.dm_status = 'Order Sent' then 'In Production'
    when o.dm_status = 'All Details Added' then 'Ready to Send'
    when o.dm_status ilike '%complete%' or o.main_status = 'Order Completed' then 'Completed'
    when exists (
      select 1 from public.proofs p
      where p.order_id = o.id and p.status = 'pending'
    ) then 'Awaiting Your Approval'
    when exists (
      select 1 from public.proofs p
      where p.order_id = o.id and p.status = 'revision_requested'
    ) then 'Revision Requested'
    else coalesce(o.main_status, 'Submitted')
  end as display_status
from public.orders o;

create or replace view public.client_self_view
with (security_invoker = true) as
select
  id,
  name,
  business_name,
  business_website,
  ein,
  disclaimer,
  default_mailer_type,
  default_class_type,
  default_mailing_quantity,
  default_digital_budget,
  is_non_profit
from public.clients
where id = public.current_client_id();

-- Backfill missing profiles. New users still flow through the trigger from
-- migration 002; this is just a one-shot for users created before this
-- migration (the demo accounts).
insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.email)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
