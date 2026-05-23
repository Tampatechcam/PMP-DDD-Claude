import 'server-only'
import { createClient } from '@/lib/supabase/server'

// Admin-only data path. RLS rejects non-admin callers, but be explicit too.
export async function adminListInvoices() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, orders ( order_number, client_id )')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
