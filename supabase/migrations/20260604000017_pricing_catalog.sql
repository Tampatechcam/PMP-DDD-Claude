-- 20260604000017_pricing_catalog.sql
--
-- Products catalog — the editable "pricing sheet" for every billable product
-- (DM mailers, digital budgets, tech add-ons, fees). Each row mirrors a Stripe
-- Product + Price so generateInvoice can push real `price_id`s. Stripe prices
-- are immutable, so a price change creates a NEW Stripe price and archives the
-- old one in product_price_history (preserving the rate-over-time trail we saw
-- in the real invoice data). Admin-only.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('dm_mailer','digital','tech','fee')),
  unit text not null default 'flat' check (unit in ('per_piece','flat','percent')),
  price numeric(10,3) not null,
  stripe_product_id text,
  stripe_price_id text,
  active boolean not null default true,
  sort int not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_price_history (
  id bigserial primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(10,3) not null,
  stripe_price_id text,
  created_at timestamptz default now()
);

-- Per-client pricing defaults — which mailer + tech add-on the advisor uses.
-- (clients.default_digital_budget already exists.)
alter table public.clients
  add column if not exists default_mailer_product_id uuid references public.products(id),
  add column if not exists default_tech_product_id   uuid references public.products(id);

alter table public.products              enable row level security;
alter table public.product_price_history enable row level security;

create policy products_admin_only on public.products for all
  using (public.is_admin()) with check (public.is_admin());
create policy product_price_history_admin_only on public.product_price_history for all
  using (public.is_admin()) with check (public.is_admin());

create index if not exists products_category_idx on public.products (category, active, sort);
