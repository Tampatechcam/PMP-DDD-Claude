'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, getAuthUser } from '@/lib/db/auth'
import { getCurrentClientIdOrThrow } from '@/lib/db/profiles'
import { recordAudit } from '@/lib/db/audit'

/**
 * Order creation.
 *
 * Numbering: integer max+1 (locked by Part 16 + docs/TODO). Without a
 * dedicated Postgres sequence, two concurrent inserts could pick the
 * same max and trip the unique constraint on order_number. We retry on
 * unique-violation a small number of times — fine for a low-volume,
 * human-driven flow. A `next_order_number` sequence is the proper fix
 * after the one-shot import has set the starting value.
 */

const MAX_RETRIES = 5

function s(form: FormData, name: string): string | null {
  const v = form.get(name)
  if (v == null) return null
  const trimmed = String(v).trim()
  return trimmed ? trimmed : null
}

function num(form: FormData, name: string): number | null {
  const v = s(form, name)
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function bool(form: FormData, name: string): boolean {
  return form.get(name) != null && form.get(name) !== '0'
}

function dateStr(form: FormData, name: string): string | null {
  const v = s(form, name)
  if (!v) return null
  // <input type="date"> gives YYYY-MM-DD which Postgres accepts as-is.
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

function timeStr(form: FormData, name: string): string | null {
  const v = s(form, name)
  if (!v) return null
  return /^\d{2}:\d{2}(:\d{2})?$/.test(v) ? v : null
}

function jsonAddress(form: FormData, prefix: string): object | null {
  const street = s(form, `${prefix}_street`)
  const city = s(form, `${prefix}_city`)
  const state = s(form, `${prefix}_state`)
  const zip = s(form, `${prefix}_zip`)
  if (!street && !city && !state && !zip) return null
  return { street, city, state, zip }
}

export async function createOrder(form: FormData) {
  const supabase = createClient()

  const needs_direct_mail = bool(form, 'needs_direct_mail')
  const needs_digital = bool(form, 'needs_digital')
  const needs_google_sheet = bool(form, 'needs_google_sheet')

  if (!needs_direct_mail && !needs_digital && !needs_google_sheet) {
    throw new Error('Pick at least one of Direct Mail, Digital, or Sheet.')
  }

  // Parallelize the two independent reads — client_id from the profile,
  // max(order_number) for the next slot. They're on the same HTTP/2
  // connection so wall-time becomes max(a, b) instead of a + b.
  const [client_id, maxRow] = await Promise.all([
    getCurrentClientIdOrThrow(),
    supabase
      .from('orders')
      .select('order_number')
      .order('order_number', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => {
        if (r.error) throw r.error
        return r.data
      })
  ])
  let nextNumber = (maxRow?.order_number ?? 0) + 1

  const payload = {
    client_id,
    office_id: s(form, 'office_id'),
    advisor_name: s(form, 'advisor_name'),
    needs_direct_mail,
    needs_digital,
    needs_google_sheet,
    class_type: s(form, 'class_type'),
    job_name: s(form, 'job_name'),
    market: s(form, 'market'),
    charity: s(form, 'charity'),
    venue_id: s(form, 'venue_id'),
    venue_text: s(form, 'venue_text'),
    venue_address_text: s(form, 'venue_address_text'),
    building_id: s(form, 'building_id'),
    room_id: s(form, 'room_id'),
    event_1_date: dateStr(form, 'event_1_date'),
    event_1_room: s(form, 'event_1_room'),
    event_2_date: dateStr(form, 'event_2_date'),
    event_2_room: s(form, 'event_2_room'),
    event_3_date: dateStr(form, 'event_3_date'),
    event_3_room: s(form, 'event_3_room'),
    event_4_date: dateStr(form, 'event_4_date'),
    event_4_room: s(form, 'event_4_room'),
    start_time: timeStr(form, 'start_time'),
    end_time: timeStr(form, 'end_time'),
    time_notes: s(form, 'time_notes'),
    // DM block — only persist when the order is DM (avoid stray numbers
    // for digital-only orders).
    mailing_quantity: needs_direct_mail ? num(form, 'mailing_quantity') : null,
    mailer_type: needs_direct_mail ? s(form, 'mailer_type') : null,
    mailer_return_address_override: needs_direct_mail
      ? jsonAddress(form, 'return_address')
      : null,
    qr_code_link: needs_direct_mail ? s(form, 'qr_code_link') : null,
    sending_list_folder_url: needs_direct_mail
      ? s(form, 'sending_list_folder_url')
      : null,
    client_approval_deadline: needs_direct_mail
      ? dateStr(form, 'client_approval_deadline')
      : null,
    order_sent_deadline: needs_direct_mail
      ? dateStr(form, 'order_sent_deadline')
      : null,
    // Digital block
    digital_budget: needs_digital ? num(form, 'digital_budget') : null,
    landing_page_url_direct: needs_digital
      ? s(form, 'landing_page_url_direct')
      : null,
    landing_page_url_digital: needs_digital
      ? s(form, 'landing_page_url_digital')
      : null,
    privacy_company_name: needs_digital ? s(form, 'privacy_company_name') : null,
    privacy_company_website: needs_digital
      ? s(form, 'privacy_company_website')
      : null,
    order_instructions: s(form, 'order_instructions'),
    notes: s(form, 'notes')
  } as const

  let inserted: { id: string; order_number: number } | null = null
  let lastError: unknown = null

  // Loop bumps nextNumber by 1 on each collision and retries. The unique
  // constraint catches the race; we don't re-query max in the retry.
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data, error } = await supabase
      .from('orders')
      .insert({ ...payload, order_number: nextNumber })
      .select('id, order_number')
      .single()

    if (!error && data) {
      inserted = data
      break
    }

    // 23505 = unique_violation. Bump the number locally and retry.
    const pgError = error as { code?: string } | null
    if (pgError?.code !== '23505') {
      throw error
    }
    lastError = error
    nextNumber++
  }

  if (!inserted) {
    throw new Error(
      `Could not pick a unique order number after ${MAX_RETRIES} tries — ` +
        `${String(lastError)}`
    )
  }

  // Audit row. INSERT...RETURNING id meant we never had to re-query.
  await supabase.from('order_events').insert({
    order_id: inserted.id,
    event: 'Order created',
    payload: {
      needs_direct_mail,
      needs_digital,
      needs_google_sheet,
      class_type: payload.class_type
    }
  })

  revalidatePath('/orders')
  redirect(`/orders/${inserted.order_number}`)
}

/**
 * Admin-side order creation. Differs from createOrder in three ways:
 *  1. client_id comes from the form (admin picks any client), not the
 *     current user's profile.
 *  2. Optional initial dm_status / digital_status so ops can record an
 *     order that's already in motion.
 *  3. Redirects into the admin shell (/admin/orders/…).
 */
export async function createOrderAsAdmin(form: FormData) {
  await requireAdmin()
  const supabase = createClient()

  const client_id = s(form, 'client_id')
  if (!client_id) throw new Error('Client is required.')

  const needs_direct_mail = bool(form, 'needs_direct_mail')
  const needs_digital = bool(form, 'needs_digital')
  const needs_google_sheet = bool(form, 'needs_google_sheet')

  if (!needs_direct_mail && !needs_digital && !needs_google_sheet) {
    throw new Error('Pick at least one of Direct Mail, Digital, or Sheet.')
  }

  const maxRow = await supabase
    .from('orders')
    .select('order_number')
    .order('order_number', { ascending: false })
    .limit(1)
    .maybeSingle()
    .then((r) => {
      if (r.error) throw r.error
      return r.data
    })
  let nextNumber = (maxRow?.order_number ?? 0) + 1

  const payload = {
    client_id,
    office_id: s(form, 'office_id') || null,
    advisor_name: s(form, 'advisor_name'),
    needs_direct_mail,
    needs_digital,
    needs_google_sheet,
    class_type: s(form, 'class_type'),
    job_name: s(form, 'job_name'),
    market: s(form, 'market'),
    charity: s(form, 'charity'),
    venue_text: s(form, 'venue_text'),
    venue_address_text: s(form, 'venue_address_text'),
    event_1_date: dateStr(form, 'event_1_date'),
    event_1_room: s(form, 'event_1_room'),
    event_2_date: dateStr(form, 'event_2_date'),
    event_2_room: s(form, 'event_2_room'),
    event_3_date: dateStr(form, 'event_3_date'),
    event_3_room: s(form, 'event_3_room'),
    event_4_date: dateStr(form, 'event_4_date'),
    event_4_room: s(form, 'event_4_room'),
    start_time: timeStr(form, 'start_time'),
    end_time: timeStr(form, 'end_time'),
    time_notes: s(form, 'time_notes'),
    mailing_quantity: needs_direct_mail ? num(form, 'mailing_quantity') : null,
    mailer_type: needs_direct_mail ? s(form, 'mailer_type') : null,
    mailer_return_address_override: needs_direct_mail
      ? jsonAddress(form, 'return_address')
      : null,
    qr_code_link: needs_direct_mail ? s(form, 'qr_code_link') : null,
    sending_list_folder_url: needs_direct_mail
      ? s(form, 'sending_list_folder_url')
      : null,
    client_approval_deadline: needs_direct_mail
      ? dateStr(form, 'client_approval_deadline')
      : null,
    order_sent_deadline: needs_direct_mail
      ? dateStr(form, 'order_sent_deadline')
      : null,
    dm_status: needs_direct_mail
      ? (s(form, 'dm_status') || 'Pending Details')
      : null,
    digital_budget: needs_digital ? num(form, 'digital_budget') : null,
    landing_page_url_direct: needs_digital
      ? s(form, 'landing_page_url_direct')
      : null,
    landing_page_url_digital: needs_digital
      ? s(form, 'landing_page_url_digital')
      : null,
    privacy_company_name: needs_digital ? s(form, 'privacy_company_name') : null,
    privacy_company_website: needs_digital
      ? s(form, 'privacy_company_website')
      : null,
    digital_status: needs_digital
      ? (s(form, 'digital_status') || 'Pending Details')
      : null,
    order_instructions: s(form, 'order_instructions'),
    notes: s(form, 'notes'),
  } as const

  type InsertedAdminRow = { id: string; order_number: number; display_ref: string | null }
  let inserted: InsertedAdminRow | null = null
  let lastError: unknown = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data, error } = await supabase
      .from('orders')
      .insert({ ...payload, order_number: nextNumber })
      .select('id, order_number, display_ref')
      .single()

    if (!error && data) {
      // supabase's inferred row type is broader than InsertedAdminRow but
      // structurally matches — cast via unknown so tsc accepts it.
      inserted = data as unknown as InsertedAdminRow
      break
    }
    const pgError = error as { code?: string } | null
    if (pgError?.code !== '23505') throw error
    lastError = error
    nextNumber++
  }

  if (!inserted) {
    throw new Error(
      `Could not pick a unique order number after ${MAX_RETRIES} tries — ${String(lastError)}`
    )
  }

  await supabase.from('order_events').insert({
    order_id: inserted.id,
    event: 'Order created (admin)',
    payload: { needs_direct_mail, needs_digital, needs_google_sheet, class_type: payload.class_type }
  })

  revalidatePath('/admin/orders')
  revalidatePath('/admin')
  const ref = inserted.display_ref ?? String(inserted.order_number)
  redirect(`/admin/orders/${ref}`)
}

/**
 * Admin status update. Lets an admin set dm_status / digital_status / main_status
 * directly from the order detail page — the workflow state that otherwise only
 * ever arrived via the sheet import. Writes an audit row and revalidates the
 * relevant paths so the change shows immediately.
 *
 * NOTE: a future run of scripts/import-v2.ts can overwrite these — the DM/Digital
 * sheets remain the source of truth for the import. Manual edits here are for
 * keeping the dashboard accurate between imports.
 */
export async function updateOrderStatus(form: FormData) {
  await requireAdmin()
  const supabase = createClient()

  const orderId = s(form, 'order_id')
  if (!orderId) throw new Error('order_id is required.')
  const ref = s(form, 'ref')

  // Only patch the status fields actually present in the submitted form.
  // (A DM-only order's form won't carry digital_status, etc.)
  const patch: Record<string, string | null> = {}
  if (form.has('dm_status')) patch.dm_status = s(form, 'dm_status')
  if (form.has('digital_status')) patch.digital_status = s(form, 'digital_status')
  if (form.has('main_status')) patch.main_status = s(form, 'main_status')

  if (Object.keys(patch).length === 0) {
    throw new Error('No status field submitted.')
  }

  const { error } = await supabase.from('orders').update(patch).eq('id', orderId)
  if (error) throw error

  await supabase.from('order_events').insert({
    order_id: orderId,
    event: 'Status updated (admin)',
    payload: patch
  })

  const user = await getAuthUser()
  await recordAudit({
    table_name: 'orders',
    row_id: orderId,
    action: 'UPDATE',
    source: 'admin-status-edit',
    actor_email: user?.email ?? null,
    after: patch
  })

  revalidatePath('/admin/orders')
  revalidatePath('/admin')
  if (ref) revalidatePath(`/admin/orders/${ref}`)
}

/**
 * Delete an order (admin only). FK cascades remove its proofs and order_events.
 * Guard: refuse if the order still has an invoice — deleting would silently drop
 * the billing record (and orphan the Stripe invoice). Void/remove the invoice
 * first. Redirects to the orders list on success.
 */
export async function deleteOrder(form: FormData) {
  await requireAdmin()
  const supabase = createClient()

  const orderId = s(form, 'order_id')
  if (!orderId) throw new Error('order_id is required.')

  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('id')
    .eq('order_id', orderId)
    .limit(1)
  if (invErr) throw invErr
  if (invoices && invoices.length > 0) {
    throw new Error(
      'This order has an invoice. Void or remove the invoice first, then delete the order.'
    )
  }

  const { error } = await supabase.from('orders').delete().eq('id', orderId)
  if (error) throw error

  const user = await getAuthUser()
  await recordAudit({
    table_name: 'orders',
    row_id: orderId,
    action: 'DELETE',
    source: 'admin-delete',
    actor_email: user?.email ?? null
  })

  revalidatePath('/admin/orders')
  revalidatePath('/admin')
  redirect('/admin/orders')
}

/**
 * Bulk-delete orders (admin only). Orders that still have an invoice are skipped
 * (not deleted) so billing records survive — returns how many were deleted vs
 * skipped so the UI can report it. No redirect; the caller refreshes the list.
 */
export async function bulkDeleteOrders(
  form: FormData
): Promise<{ deleted: number; skipped: number }> {
  await requireAdmin()
  const supabase = createClient()

  const ids = String(form.get('order_ids') ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  if (ids.length === 0) return { deleted: 0, skipped: 0 }

  // Skip any order that has an invoice (don't destroy billing records).
  const { data: invoiced, error: invErr } = await supabase
    .from('invoices')
    .select('order_id')
    .in('order_id', ids)
  if (invErr) 