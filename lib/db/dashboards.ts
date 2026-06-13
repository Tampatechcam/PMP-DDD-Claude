import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Counts for the admin Overview tiles. Single round-trip via four
 * head-count queries fired in parallel. RLS lets admins see every row,
 * so the counts reflect the global state.
 *
 * `orders` is filtered to `needs_direct_mail = true` so the tile matches
 * what the Upcoming/Past tabs actually show — digital-only campaigns
 * don't bucket into the tabs.
 */
export async function adminCounts(): Promise<{
  clients: number
  orders: number
  pendingProofs: number
  invoices: number
}> {
  const supabase = createClient()
  const [
    { count: clientsCount },
    { count: ordersCount },
    { count: pendingProofsCount },
    { count: invoicesCount }
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('needs_direct_mail', true),
    supabase
      .from('proofs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('invoices').select('id', { count: 'exact', head: true })
  ])
  return {
    clients: clientsCount ?? 0,
    orders: ordersCount ?? 0,
    pendingProofs: pendingProofsCount ?? 0,
    invoices: invoicesCount ?? 0
  }
}
