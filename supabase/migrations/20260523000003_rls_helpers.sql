-- 20260523000003_rls_helpers.sql
-- Helper functions used in RLS policies. SECURITY DEFINER so they read
-- public.profiles even when the calling row's policy hasn't been checked yet.

create or replace function public.current_client_id()
returns uuid language sql stable security definer set search_path = public as $$
  select client_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
$$;
