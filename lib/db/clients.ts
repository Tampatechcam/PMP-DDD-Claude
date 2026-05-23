import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Client-facing reads go through client_self_view, which omits responsibility,
 * mailer rate, discount, and other internal fields. See Part 4.4 of the plan.
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

// Admin-only — uses the base table, must be gated by is_admin() in the caller.
export async function adminListClients() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}
