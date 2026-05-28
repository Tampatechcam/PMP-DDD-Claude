import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getImpersonatedClientId } from '@/lib/db/impersonation'

// The columns client_self_view exposes — i.e. everything EXCEPT the internal
// fields (responsibility, mailer rate, discount, tech sequences). Used for the
// admin "view as" path, which reads the base table (admins can) but must show
// the same shape a real client sees.
const SELF_VIEW_COLUMNS =
  'id, name, business_name, business_website, ein, disclaimer, ' +
  'default_mailer_type, default_class_type, default_mailing_quantity, ' +
  'default_digital_budget, is_non_profit, is_group'

/**
 * Client-facing reads go through client_self_view, which omits internal
 * fields (responsibility, mailer rate, discount, tech sequences). See
 * Part 4.4 of the implementation plan.
 *
 * When an admin is impersonating ("view as client"), client_self_view returns
 * nothing (it filters by current_client_id(), which is null for admins), so we
 * read the base clients row by id instead — restricted to the same column set
 * the view exposes, so the preview is faithful. Normal clients always go
 * through the view; the base table is never read for them (it would leak the
 * internal fields RLS would otherwise allow them on their own row).
 */
export async function getCurrentClientSelf() {
  const supabase = createClient()
  const impersonatedId = await getImpersonatedClientId()

  if (impersonatedId) {
    const { data, error } = await supabase
      .from('clients')
      .select(SELF_VIEW_COLUMNS)
      .eq('id', impersonatedId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('client_self_view')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * The { id, name } of the client an admin is currently "viewing as", or null
 * when not impersonating. Drives the persistent "Viewing as …" banner in the
 * client shell. Admin RLS lets us read any client row by id; the admin-only
 * gate on the impersonation cookie is enforced in getImpersonatedClientId.
 */
export async function getImpersonatedClientBrief(): Promise<{ id: string; name: string } | null> {
  const impersonatedId = await getImpersonatedClientId()
  if (!impersonatedId) return null
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', impersonatedId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

// Admin reads — base table. RLS still gates, but the policy lets admins
// see everything.
export async function adminListClients() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function adminGetClient(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function adminListOfficesForClient(clientId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('offices')
    .select('*')
    .eq('client_id', clientId)
    .order('name')
  if (error) throw error
  return data ?? []
}

/**
 * Order counts per client_id, computed in one trip. Used by
 * /admin/clients to show "n orders" next to each client/group without
 * N+1 round-trips. Returns a Record keyed by client_id.
 */
export async function adminOrderCountsByClient(): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data, error } = await supabase.from('orders').select('client_id')
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const id = (row as { client_id?: string | null }).client_id
    if (!id) continue
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}
