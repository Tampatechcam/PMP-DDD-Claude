-- 20260523000005_views.sql
-- Derived views. Status derivation lives here, not in React.

-- Display status: collapses dm/digital/main/proof state into one string the
-- client UI shows on a card. Stays a view so it cannot drift from the rows.
create or replace view public.orders_with_display_status as
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

-- Safe client-facing view of clients. Never exposes internal fields like
-- responsibility, default_mailer_rate, direct_mail_discount, tech_sequences.
-- Use this in the client UI; use the base table only in admin UI.
create or replace view public.client_self_view as
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
