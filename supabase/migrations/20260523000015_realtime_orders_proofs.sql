-- 20260523000015_realtime_orders_proofs.sql
-- Enable Supabase Realtime for the tables the client portal watches, so the
-- UI can live-refresh the instant a record changes (e.g. a proof upload flips
-- an order's display_status to "Awaiting Your Approval").
--
-- RLS still applies to Realtime postgres_changes: a session only receives
-- events for rows it can already SELECT, so there is no cross-tenant leakage.
-- Default replica identity (primary key) is sufficient — the client only needs
-- to know "something changed", not the old row values.
--
-- Idempotent: guarded so re-running (or `supabase db push`) is a no-op.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'proofs'
  ) then
    alter publication supabase_realtime add table public.proofs;
  end if;
end $$;
