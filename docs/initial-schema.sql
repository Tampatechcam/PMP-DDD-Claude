-- Combined migrations 001-006 for one-shot paste into the Supabase SQL editor.
-- Generated 2026-05-23T05:06:17-04:00. If you applied these one by one via supabase db push,
-- ignore this file.

-- ===== 20260523000001_init_schema.sql =====
-- 20260523000001_init_schema.sql
-- Initial tables for the PMP client dashboard.
-- Mirrors Part 4.1 of the implementation plan.

-- CLIENTS: the login entity (FMO or independent firm)
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_group boolean default false,
  business_name text,
  business_website text,
  ein text,
  ein_match_name text,
  disclaimer text,
  description text,
  notes text,
  default_mailer_rate numeric(6,3),
  default_mailing_quantity int,
  default_digital_budget numeric(10,2),
  default_mailer_type text,
  default_class_type text,
  tech_sequences text,
  direct_mail_discount text,
  start_before_paid boolean default false,
  responsibility text,
  is_non_profit boolean default false,
  created_at timestamptz default now()
);

-- OFFICES: advisor/location under a client
create table public.offices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  advisor_names text[],
  business_address jsonb,
  mailer_return_address jsonb,
  registration_phone text,
  registration_url_direct text,
  registration_url_digital text,
  main_contact jsonb,
  secondary_contact jsonb,
  cc_emails text[],
  is_primary boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- VENUES / BUILDINGS / ROOMS (per-client picklists)
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  address jsonb,
  notes text,
  asset_availability text,
  applicable_class_types text[],
  created_at timestamptz default now(),
  unique (client_id, name)
);

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  name text not null,
  capacity int
);

-- PROFILES (one row per auth user)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  full_name text,
  role text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz default now()
);

-- ORDERS
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number int unique not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  office_id uuid references public.offices(id),
  advisor_name text,
  needs_direct_mail boolean default false,
  needs_digital boolean default false,
  needs_google_sheet boolean default false,
  class_type text,
  job_name text,
  market text,
  charity text,
  venue_id uuid references public.venues(id),
  building_id uuid references public.buildings(id),
  room_id uuid references public.rooms(id),
  venue_text text,
  venue_address_text text,
  event_1_date date, event_1_room text,
  event_2_date date, event_2_room text,
  event_3_date date, event_3_room text,
  event_4_date date, event_4_room text,
  start_time time, end_time time, time_notes text,
  mailing_quantity int,
  mailer_type text,
  mailer_return_address_override jsonb,
  qr_code_link text,
  selected_mailer_design text,
  sending_list_folder_url text,
  client_approval_deadline date,
  order_sent_deadline date,
  first_class_day date,
  teledirect_added text,
  digital_budget numeric(10,2),
  landing_page_url_direct text,
  landing_page_url_digital text,
  privacy_company_name text,
  privacy_company_website text,
  digital_disclaimer text,
  ethnicity_avoid text,
  qa_status text, tp_status text, sheet_needed text,
  dm_status text,
  digital_status text,
  invoice_status text,
  main_status text,
  order_instructions text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.orders (client_id, event_1_date desc);
create index on public.orders (order_number);

-- PROOFS
create table public.proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  version int not null default 1,
  storage_path text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','revision_requested')),
  client_comment text,
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (order_id, version)
);

-- INVOICES (admin-only — see RLS)
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null default 'Not Started',
  invoice_sent_date date,
  invoice_paid_date date,
  invoiced_dm_rate numeric(6,3),
  invoiced_dm_total numeric(12,2),
  invoiced_digital numeric(12,2),
  invoiced_tech numeric(12,2),
  cc_processing numeric(12,2),
  fl_state_tax numeric(12,2),
  total_invoice numeric(12,2),
  created_at timestamptz default now()
);

-- AUDIT LOG (insert-only stream of what happened to an order)
create table public.order_events (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  event text not null,
  payload jsonb,
  actor uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ===== 20260523000002_triggers.sql =====
-- 20260523000002_triggers.sql
-- updated_at touch + profile creation on new auth.users insert.

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Auto-create a profile row for every new auth user.
-- Role defaults to 'client'; promote your first admin manually (see Part 6.4).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== 20260523000003_rls_helpers.sql =====
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

-- ===== 20260523000004_rls_policies.sql =====
-- 20260523000004_rls_policies.sql
-- Enable RLS on every table + the policies that enforce the client/admin split.

alter table public.clients      enable row level security;
alter table public.offices      enable row level security;
alter table public.venues       enable row level security;
alter table public.buildings    enable row level security;
alter table public.rooms        enable row level security;
alter table public.profiles     enable row level security;
alter table public.orders       enable row level security;
alter table public.proofs       enable row level security;
alter table public.invoices     enable row level security;
alter table public.order_events enable row level security;

-- CLIENTS ----------------------------------------------------------------
create policy clients_select on public.clients for select
  using (id = public.current_client_id() or public.is_admin());

create policy clients_admin_write on public.clients for all
  using (public.is_admin())
  with check (public.is_admin());

-- OFFICES ----------------------------------------------------------------
create policy offices_select on public.offices for select
  using (client_id = public.current_client_id() or public.is_admin());

create policy offices_admin_write on public.offices for all
  using (public.is_admin())
  with check (public.is_admin());

-- VENUES -----------------------------------------------------------------
create policy venues_select on public.venues for select
  using (client_id = public.current_client_id() or public.is_admin());

create policy venues_cud on public.venues for all
  using (client_id = public.current_client_id() or public.is_admin())
  with check (client_id = public.current_client_id() or public.is_admin());

-- BUILDINGS (scoped through their venue) --------------------------------
create policy buildings_all on public.buildings for all
  using (
    exists (
      select 1 from public.venues v
      where v.id = buildings.venue_id
        and (v.client_id = public.current_client_id() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.venues v
      where v.id = buildings.venue_id
        and (v.client_id = public.current_client_id() or public.is_admin())
    )
  );

-- ROOMS (scoped through building -> venue) ------------------------------
create policy rooms_all on public.rooms for all
  using (
    exists (
      select 1 from public.buildings b
      join public.venues v on v.id = b.venue_id
      where b.id = rooms.building_id
        and (v.client_id = public.current_client_id() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.buildings b
      join public.venues v on v.id = b.venue_id
      where b.id = rooms.building_id
        and (v.client_id = public.current_client_id() or public.is_admin())
    )
  );

-- PROFILES ---------------------------------------------------------------
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Users can update their own profile, but cannot change their own role.
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
  );

create policy profiles_admin_write on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ORDERS -----------------------------------------------------------------
create policy orders_select on public.orders for select
  using (client_id = public.current_client_id() or public.is_admin());

create policy orders_insert on public.orders for insert
  with check (client_id = public.current_client_id() or public.is_admin());

-- Updates are admin-only for now. Client-facing changes flow through proofs.
create policy orders_update_admin on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- PROOFS -----------------------------------------------------------------
create policy proofs_select on public.proofs for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = proofs.order_id
        and (o.client_id = public.current_client_id() or public.is_admin())
    )
  );

-- A client can approve / request revision on their own proofs. They cannot
-- flip back to 'pending' — the with-check restricts terminal status values.
create policy proofs_client_decide on public.proofs for update
  using (
    exists (
      select 1 from public.orders o
      where o.id = proofs.order_id and o.client_id = public.current_client_id()
    )
  )
  with check (status in ('approved','revision_requested'));

create policy proofs_admin_write on public.proofs for all
  using (public.is_admin())
  with check (public.is_admin());

-- INVOICES (admin-only — clients don't see invoices in v1) --------------
create policy invoices_admin_only on public.invoices for all
  using (public.is_admin())
  with check (public.is_admin());

-- ORDER_EVENTS (audit log) ----------------------------------------------
-- Clients can read events for their own orders; admin can read all.
-- Inserts come from Server Actions running as the user — RLS still enforced.
create policy order_events_select on public.order_events for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and (o.client_id = public.current_client_id() or public.is_admin())
    )
  );

create policy order_events_insert on public.order_events for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and (o.client_id = public.current_client_id() or public.is_admin())
    )
  );

-- ===== 20260523000005_views.sql =====
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

-- ===== 20260523000006_storage.sql =====
-- 20260523000006_storage.sql
-- Private 'proofs' bucket + RLS on storage.objects.
-- Path convention: proofs/{client_id}/{order_number}/{version}.pdf

insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

-- Clients can read PDFs that live under their own client_id folder.
create policy "proofs read own client"
  on storage.objects for select
  using (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1]::uuid = public.current_client_id()
  );

-- Admin can do anything in the bucket. Clients never upload.
create policy "proofs admin all"
  on storage.objects for all
  using (bucket_id = 'proofs' and public.is_admin())
  with check (bucket_id = 'proofs' and public.is_admin());

