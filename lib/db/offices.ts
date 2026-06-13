import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getImpersonatedClientId } from '@/lib/db/impersonation'

export async function listOfficesForCurrentClient() {
  const supabase = createClient()
  const impersonatedId = await getImpersonatedClientId()

  let q = supabase.from('offices').select('*').order('name')
  // Admin "view as" must scope explicitly; normal clients are RLS-scoped.
  if (impersonatedId) q = q.eq('client_id', impersonatedId)

  const { data, error } = await q
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
  main_contact: OfficeContact | null
  secondary_contact: OfficeContact | null
  mailer_return_address: { freeform?: string } | Record<string, unknown> | null
}

export type OfficeContact = {
  name?: string | null
  email?: string | null
  phone?: string | null
  position?: string | null
}

/**
 * All offices across all clients — for admin pages that need a flat list.
 * Returns both `state` (used by /admin/clients group tables) and
 * `advisor_names` (used by the admin order-create form's advisor datalist).
 */
export async function adminListAllOffices() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('offices')
    .select(
      'id, name, client_id, state, advisor_names, ' +
      'default_class_type, default_mailing_quantity, default_mailer_type, ' +
      'default_start_time, default_end_time, default_charity, ' +
      'default_needs_dm, default_needs_digital, default_needs_sheet'
    )
    .order('name')
  if (error) throw error
  return (data ?? []) as {
    id: string
    name: string
    client_id: string
    state: string | null
    advisor_names: string[] | null
    default_class_type: string | null
    default_mailing_quantity: number | null
    default_mailer_type: string | null
    default_start_time: string | null
    default_end_time: string | null
    default_charity: string | null
    default_needs_dm: boolean | null
    default_needs_digital: boolean | null
    default_needs_sheet: boolean | null
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
      'name, state, registration_phone, registration_url_direct, registration_url_digital, advisor_names, main_contact, secondary_contact, mailer_return_address'
    )
    .eq('id', officeId)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as OfficeForOrderCard | null
}
