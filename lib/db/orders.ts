import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Order reads. UI never calls supabase.from directly — see .cline/rules.md
 * and Part 1 of the implementation plan.
 *
 * Reads use orders_with_display_status so the card-level status string
 * stays in SQL and the UI just renders a pill.
 */

export type OrderRow = {
  id: string
  order_number: number
  client_id: string
  office_id: string | null
  advisor_name: string | null
  needs_direct_mail: boolean
  needs_digital: boolean
  needs_google_sheet: boolean
  class_type: string | null
  job_name: string | null
  market: string | null
  charity: string | null
  venue_id: string | null
  venue_text: string | null
  venue_address_text: string | null
  event_1_date: string | null; event_1_room: string | null
  event_2_date: string | null; event_2_room: string | null
  event_3_date: string | null; event_3_room: string | null
  event_4_date: string | null; event_4_room: string | null
  start_time: string | null
  end_time: string | null
  time_notes: string | null
  mailing_quantity: number | null
  mailer_type: string | null
  mailer_return_address_override: Record<string, unknown> | null
  qr_code_link: string | null
  sending_list_folder_url: string | null
  client_approval_deadline: string | null
  order_sent_deadline: string | null
  first_class_day: string | null
  digital_budget: number | null
  landing_page_url_direct: string | null
  landing_page_url_digital: string | null
  privacy_company_name: string | null
  privacy_company_website: string | null
  dm_status: string | null
  digital_status: string | null
  main_status: string | null
  display_status: string
  order_instructions: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function listOrdersForClient(opts?: { officeId?: string }) {
  const supabase = createClient()
  let q = supabase
    .from('orders_with_display_status')
    .select('*')
    .order('event_1_date', { ascending: false, nullsFirst: false })

  if (opts?.officeId) q = q.eq('office_id', opts.officeId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as OrderRow[]
}

export async function getOrderByNumber(orderNumber: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders_with_display_status')
    .select('*')
    .eq('order_number', orderNumber)
    .maybeSingle()
  if (error) throw error
  return data as OrderRow | null
}

export type OrderEventRow = {
  id: number
  event: string
  payload: Record<string, unknown> | null
  actor: string | null
  created_at: string
}

/**
 * Admin-side global orders list. RLS lets admins read every order, and we
 * lean on the same view so the display_status string is consistent across
 * client and admin shells. Filters compose: pass any subset.
 */
export async function adminListOrders(opts?: {
  clientId?: string
  classType?: string
  needs?: 'direct_mail' | 'digital'
  search?: string
  limit?: number
}) {
  const supabase = createClient()
  let q = supabase
    .from('orders_with_display_status')
    .select('*')
    .order('event_1_date', { ascending: false, nullsFirst: false })

  if (opts?.clientId) q = q.eq('client_id', opts.clientId)
  if (opts?.classType) q = q.eq('class_type', opts.classType)
  if (opts?.needs === 'direct_mail') q = q.eq('needs_direct_mail', true)
  if (opts?.needs === 'digital') q = q.eq('needs_digital', true)
  if (opts?.search) {
    const term = `%${opts.search}%`
    // ilike across the most useful free-text columns
    q = q.or(
      `job_name.ilike.${term},market.ilike.${term},advisor_name.ilike.${term}`
    )
  }
  if (opts?.limit) q = q.limit(opts.limit)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as OrderRow[]
}

export async function listEventsForOrder(orderId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('order_events')
    .select('id, event, payload, actor, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as OrderEventRow[]
}
