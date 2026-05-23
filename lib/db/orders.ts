import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * All order reads/writes go through this module. UI never calls supabase.from
 * directly — see .cline/rules.md and Part 1 of the implementation plan.
 *
 * Reads use the display-status view so card-level status logic stays in SQL.
 */

export async function listOrdersForClient(opts?: { officeId?: string }) {
  const supabase = createClient()
  let q = supabase
    .from('orders_with_display_status')
    .select('*')
    .order('event_1_date', { ascending: false, nullsFirst: false })

  if (opts?.officeId) q = q.eq('office_id', opts.officeId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getOrderByNumber(orderNumber: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders_with_display_status')
    .select('*')
    .eq('order_number', orderNumber)
    .single()
  if (error) throw error
  return data
}
