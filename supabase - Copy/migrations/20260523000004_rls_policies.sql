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
