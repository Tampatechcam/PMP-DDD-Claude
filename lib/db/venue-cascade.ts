import { createClient } from '@/lib/supabase/server'

/**
 * Data for the Office → Venue → Building → Room cascade on /admin/orders/new.
 * One round-trip per table, all returned to the page which threads them into
 * the form. The form does pure in-memory filtering — no extra DB calls when
 * the operator changes a dropdown.
 */

export interface CascadeVenue {
  id: string
  office_id: string | null
  name: string
  address: { formatted?: string } | null
}

export interface CascadeBuilding {
  id: string
  venue_id: string
  name: string
}

export interface CascadeRoom {
  id: string
  building_id: string
  name: string
}

export async function loadVenueCascade(): Promise<{
  venues: CascadeVenue[]
  buildings: CascadeBuilding[]
  rooms: CascadeRoom[]
}> {
  const supabase = createClient()
  const [{ data: venues }, { data: buildings }, { data: rooms }] = await Promise.all([
    supabase.from('venues').select('id, office_id, name, address').order('name'),
    supabase.from('buildings').select('id, venue_id, name').order('name'),
    supabase.from('rooms').select('id, building_id, name').order('name')
  ])
  return {
    venues: (venues ?? []) as CascadeVenue[],
    buildings: (buildings ?? []) as CascadeBuilding[],
    rooms: (rooms ?? []) as CascadeRoom[]
  }
}
