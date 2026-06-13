-- Buildings, rooms, office-scoped venues, and per-office defaults.
--
-- Why: Will Warner / FTA / Sentinel all have offices in multiple cities, and
-- each office has its own set of venues / buildings / rooms it uses. Today
-- venue/building/room live as free-text on orders. Normalizing lets the intake
-- form cascade Office → Venue → Building → Room, and lets us pre-fill defaults
-- per office (FTA STL likes R90 at 6:00 PM; FTA CHI likes R101 at 6:30 PM).

-- 1) buildings table — a venue can have one or many buildings
CREATE TABLE IF NOT EXISTS public.buildings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name        text NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS buildings_venue_idx ON public.buildings (venue_id);
CREATE UNIQUE INDEX IF NOT EXISTS buildings_venue_name_uq ON public.buildings (venue_id, lower(name));

-- 2) rooms table — a building has many rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id  uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name         text NOT NULL,
  capacity     int,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rooms_building_idx ON public.rooms (building_id);
CREATE UNIQUE INDEX IF NOT EXISTS rooms_building_name_uq ON public.rooms (building_id, lower(name));

-- 3) venues get an office_id so we can filter venues → office in the intake form
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS venues_office_idx ON public.venues (office_id);

-- 4) per-office defaults — what the form pre-fills when this office is picked
ALTER TABLE public.offices
  ADD COLUMN IF NOT EXISTS default_class_type        text,
  ADD COLUMN IF NOT EXISTS default_mailing_quantity  int,
  ADD COLUMN IF NOT EXISTS default_mailer_type       text,
  ADD COLUMN IF NOT EXISTS default_start_time        text,
  ADD COLUMN IF NOT EXISTS default_end_time          text,
  ADD COLUMN IF NOT EXISTS default_charity           text;

-- 5) RLS — admins do everything, everyone else read-only (mirrors the venues policy)
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms     ENABLE ROW LEVEL SECURITY;

CREATE POLICY buildings_admin_all
  ON public.buildings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY rooms_admin_all
  ON public.rooms FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE public.buildings IS 'Buildings within a venue. Used by intake to cascade Venue → Building → Room.';
COMMENT ON TABLE public.rooms     IS 'Rooms within a building.';
COMMENT ON COLUMN public.venues.office_id IS 'Which office uses this venue. Scopes the intake form''s venue picker.';
