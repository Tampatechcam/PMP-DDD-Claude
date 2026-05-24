-- 20260523000014_client_self_view_is_group.sql
-- Adds is_group to client_self_view so the client order detail page can
-- show "Group client" vs "Independent client" correctly. Previously the
-- column was omitted, causing ClientInfoCard to always receive
-- is_group: undefined and render "Independent client" even for FTA.
-- Flagged as finding ⚠️ in V002-verify-feature-admin-views.md.

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
  is_non_profit,
  is_group
from public.clients
where id = public.current_client_id();
