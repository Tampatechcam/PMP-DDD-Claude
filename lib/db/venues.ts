import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getImpersonatedClientId } from '@/lib/db/impersonation'

/**
 * Venues + their buildings + each building's rooms, in one query.
 *
 * RLS restricts to the caller's client (or admin sees all). We sort venues
 * by name in JS rather than asking Postgres — the embedded join wouldn't
 * sort the nested arrays anyway, and counts are small (tens per client).
 */
export type VenueWithChildren = {
  id: string
  name: string
  notes: string | null
  asset_availability: string | null
  applicable_class_types: string[] | null
  address: { street?: string; city?: string; state?: string; zip?: string } | null
  buildings: {
    id: string
    name: string
    rooms: { id: string; name: string; capacity: number | null }[]
  }[]
}

export async function listVenuesForCurrentClient(): Promise<VenueWithChildren[]> {
  const supabase = createClient()
  const impersonatedId = await getImpersonatedClientId()

  let q = supabase
    .from('venues')
    .select(
      'id, name, notes, asset_availability, applicable_class_types, address, ' +
      'buildings ( id, name, rooms ( id, name, capacity ) )'
    )
    .order('name')
  // Normal clients are RLS-scoped to their own venues; an admin "viewing as"
  // a client must scope explicitly — admin RLS would otherwise return every
  // client's venues (and leak them into the new-order venue picker).
  if (impersonatedId) q = q.eq('client_id', impersonatedId)

  const { data, error } = await q
  if (error) throw error
  // Supabase's embedded-relation type doesn't structurally match our
  // hand-typed shape (relationship inference returns broader unions).
  // Cast through unknown — the DB FK chain guarantees the structure.
  return (data ?? []) as unknown as VenueWithChildren[]
}
