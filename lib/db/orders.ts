import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getImpersonatedClientId } from '@/lib/db/impersonation'

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
  /**
   * Public-facing identifier. Null for DM orders (the UI falls back to
   * '#' || order_number — the real order number from the DM sheet).
   * `DIG-NNN` for digital-only orders, which don't have a real number
   * in any source sheet — see migration 012.
   */
  display_ref: string | null
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

/** Columns needed by OrdersList, AdminAttention, and admin filter chips. */
const ORDER_LIST_SELECT =
  'id, order_number, display_ref, client_id, advisor_name, needs_direct_mail, class_type, market, venue_text, event_1_date, event_2_date, order_sent_deadline, dm_status, display_status'

const DEFAULT_LIST_LIMIT = 500

export async function listOrdersForClient(opts?: { officeId?: string }) {
  const supabase = createClient()
  const impersonatedId = await getImpersonatedClientId()

  let q = supabase
    .from('orders_with_display_status')
    .select(ORDER_LIST_SELECT)
    .order('event_1_date', { ascending: true, nullsFirst: false })
    .limit(DEFAULT_LIST_LIMIT)

  // Normal clients rely on RLS to scope to their own orders. An admin who is
  // "viewing as" a client must scope explicitly — admin RLS would otherwise
  // return every client's orders.
  if (impersonatedId) q = q.eq('client_id', impersonatedId)
  if (opts?.officeId) q = q.eq('office_id', opts.officeId)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as OrderRow[]
}

/**
 * Order by primary-key uuid. Used by the proof-upload page (which routes
 * by id, not number, on purpose — see the page comment) and anywhere
 * else that's already holding a row id rather than the number/ref slug.
 *
 * Pulls a narrow column set rather than the full view so callers that
 * just need order_number/advisor_name/event_1_date don't pay for the
 * display_status case-when.
 */
export async function getOrderById(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, display_ref, client_id, class_type, advisor_name, event_1_date')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
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

/**
 * Look up an order by URL slug — accepts either a numeric `order_number`
 * (DM orders, e.g. "651") or a string `display_ref` (digital-only,
 * e.g. "DIG-001"). Returns null for either bad input or no-such-order
 * so the page can call notFound() uniformly.
 */
export async function getOrderByRef(ref: string) {
  const supabase = createClient()
  if (/^\d+$/.test(ref)) {
    const n = Number(ref)
    if (!Number.isInteger(n) || n <= 0) return null
    const { data, error } = await supabase
      .from('orders_with_display_status')
      .select('*')
      .eq('order_number', n)
      .maybeSingle()
    if (error) throw error
    return data as OrderRow | null
  }
  // Display ref — case-sensitive match (we mint them uppercase).
  const { data, error } = await supabase
    .from('orders_with_display_status')
    .select('*')
    .eq('display_ref', ref)
    .maybeSingle()
  if (error) throw error
  return data as OrderRow | null
}

/**
 * Client-shell variant of getOrderByRef. Same lookup, but when an admin is
 * "viewing as" a client, an order belonging to any *other* client is treated
 * as not-found — so the impersonation sandbox can't be escaped by typing a
 * different order's number/ref into the URL.
 *
 * Real clients are already RLS-scoped (orders_select restricts non-admins to
 * their own client_id), so the extra check is a no-op for them and only the
 * impersonating-admin case actually narrows. The plain getOrderByRef stays
 * unscoped for the admin order shell, which is meant to read any order.
 */
export async function getOrderByRefForClient(ref: string) {
  const order = await getOrderByRef(ref)
  if (!order) return null
  const impersonatedId = await getImpersonatedClientId()
  if (impersonatedId && order.client_id !== impersonatedId) return null
  return order
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
 *
 * Date range filters on `event_1_date` (the seminar date) — that's what
 * ops typically asks about ("show me Jan 2026 events"). `from` / `to`
 * are inclusive ISO dates (`YYYY-MM-DD`).
 *
 * `displayStatus` filters on the view's computed `display_status` text
 * (e.g. "Order Sent", "Awaiting Your Approval"). Exact match.
 */
export async function adminListOrders(opts?: {
  clientId?: string
  classType?: string
  needs?: 'direct_mail' | 'digital'
  search?: string
  from?: string
  to?: string
  displayStatus?: string
  limit?: number
}) {
  const supabase = createClient()
  let q = supabase
    .from('orders_with_display_status')
    .select(ORDER_LIST_SELECT)
    .order('event_1_date', { ascending: true, nullsFirst: false })

  if (opts?.clientId) q = q.eq('client_id', opts.clientId)
  if (opts?.classType) q = q.eq('class_type', opts.classType)
  if (opts?.needs === 'direct_mail') q = q.eq('needs_direct_mail', true)
  if (opts?.needs === 'digital') q = q.eq('needs_digital', true)
  if (opts?.from) q = q.gte('event_1_date', opts.from)
  if (opts?.to) q = q.lte('event_1_date', opts.to)
  if (opts?.displayStatus) q = q.eq('display_status', opts.displayStatus)
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

/**
 * Distinct `display_status` values seen across all orders. Drives the
 * status dropdown on /admin/orders so it stays accurate as new ops
 * statuses appear in the DM / Digital sheets.
 */
export async function adminDistinctOrderStatuses(): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders_with_display_status')
    .select('display_status')
    .not('display_status', 'is', null)
  if (error) throw error
  const set = new Set<string>()
  for (const r of data ?? []) {
    const s = (r as { display_status?: string | null }).display_status
    if (s) set.add(s)
  }
  return [...set].sort()
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

export type PastVenue = {
  venue_text: string
  venue_address_text: string | null
}

/**
 * Distinct venues seen across the client's order history (imported from the
 * DM sheet). Used to pre-fill the venue name + address on the new-order form
 * so the user doesn't have to retype a location they've used before.
 *
 * Deduplicates by venue_text (case-sensitive, first address wins). RLS
 * restricts the query to the caller's client.
 */
export async function listDistinctVenuesFromOrders(): Promise<PastVenue[]> {
  const supabase = createClient()
  const impersonatedId = await getImpersonatedClientId()

  let q = supabase
    .from('orders')
    .select('venue_text, venue_address_text')
    .not('venue_text', 'is', null)
    .order('venue_text')
  // Same as the order list: scope an impersonating admin to the viewed client
  // so the new-order venue quick-fill doesn't surface other clients' venues.
  // Real clients stay RLS-scoped.
  if (impersonatedId) q = q.eq('client_id', impersonatedId)

  const { data, error } = await q
  if (error) throw error

  const seen = new Set<string>()
  const result: PastVenue[] = []
  for (const row of data ?? []) {
    const name = (row as { venue_text?: string | null }).venue_text
    if (!name || seen.has(name)) continue
    seen.add(name)
    result.push({
      venue_text: name,
      venue_address_text: (row as { venue_address_text?: string | null }).venue_address_text ?? null,
    })
  }
  return result
}
