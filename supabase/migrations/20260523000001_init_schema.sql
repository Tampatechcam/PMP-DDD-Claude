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
