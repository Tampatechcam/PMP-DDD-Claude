'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentClientIdOrThrow } from '@/lib/db/profiles'

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
  const client_id = await getCurrentClientIdOrThrow()
  const supabase = createClient()

  const needs_direct_mail = bool(form, 'needs_direct_mail')
  const needs_digital = bool(form, 'needs_digital')
  const needs_google_sheet = bool(form, 'needs_google_sheet')

  if (!needs_direct_mail && !needs_digital && !needs_google_sheet) {
    throw new Error('Pick at least one of Direct Mail, Digital, or Sheet.')
  }

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

  let inserted: { order_number: number } | null = null
  let lastError: unknown = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Atomic enough for our concurrency: read max, write max+1.
    // The unique constraint on order_number catches the race.
    const { data: maxRow, error: maxErr } = await supabase
      .from('orders')
      .select('order_number')
      .order('order_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (maxErr) throw maxErr

    const nextNumber = (maxRow?.order_number ?? 0) + 1

    const { data, error } = await supabase
      .from('orders')
      .insert({ ...payload, order_number: nextNumber })
      .select('order_number')
      .single()

    if (!error && data) {
      inserted = data
      break
    }

    // 23505 = unique_violation. Retry; anything else, bail.
    const pgError = error as { code?: string } | null
    if (pgError?.code !== '23505') {
      throw error
    }
    lastError = error
  }

  if (!inserted) {
    throw new Error(
      `Could not pick a unique order number after ${MAX_RETRIES} tries — ` +
        `${String(lastError)}`
    )
  }

  // Append an audit row so the History section on the order card has content
  // on day one. RLS lets the caller insert because they own the order.
  // We fetch the new order's id to FK it, but we already have order_number;
  // easier to just look it up.
  const { data: created } = await supabase
    .from('orders')
    .select('id')
    .eq('order_number', inserted.order_number)
    .single()
  if (created) {
    await supabase.from('order_events').insert({
      order_id: created.id,
      event: 'Order created',
      payload: {
        needs_direct_mail,
        needs_digital,
        needs_google_sheet,
        class_type: payload.class_type
      }
    })
  }

  revalidatePath('/orders')
  redirect(`/orders/${inserted.order_number}`)
}
