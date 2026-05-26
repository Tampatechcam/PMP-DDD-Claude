import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function listOfficesForCurrentClient() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('offices')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

/**
 * Subset of office columns used by ClientInfoCard on the order detail
 * pages. Kept narrow on purpose so callers don't accidentally pull in
 * the jsonb contact blobs they don't render.
 */
export type OfficeForOrderCard = {
  name: string
  state: string | null
  registration_phone: string | null
  registration_url_direct: string | null
  registration_url_digital: string | null
  advisor_names: string[] | null
  mailer_return_address: { freeform?: string } | Record<string, unknown> | null
}

/** All offices across all clients — for admin forms that need a flat list. */
export async function adminListAllOffices() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('offices')
    .select('id, name, client_id, advisor_names')
    .order('name')
  if (error) throw error
  return (data ?? []) as {
    id: string
    name: string
    client_id: string
    advisor_names: string[] | null
  }[]
}

/**
 * Single office by uuid. Returns null when the order has no office_id
 * (digital-only orders sometimes do) or when the row was removed.
 */
export async function getOfficeForOrderCard(
  officeId: string
): Promise<OfficeForOrderCard | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('offices')
    .select(
      'name, state, registration_phone, registration_url_direct, registration_url_digital, advisor_names, mailer_return_address'
    )
    .eq('id', officeId)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as OfficeForOrderCard | null
}
