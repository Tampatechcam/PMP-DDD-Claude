import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Client-facing reads go through client_self_view, which omits internal
 * fields (responsibility, mailer rate, discount, tech sequences). See
 * Part 4.4 of the implementation plan.
 */
export async function getCurrentClientSelf() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('client_self_view')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
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
