-- 20260523000013_office_state.sql
-- Add a denormalized state column to offices so the admin client detail
-- page can show a region badge per office without re-aggregating from
-- order venue addresses on every render. Backfilled by
-- scripts/backfill-office-fields.ts.

alter table public.offices
  add column if not exists state text;

create index if not exists offices_state_idx on public.offices (state);
