'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/db/auth'
import { recordAudit } from '@/lib/db/audit'
import { parseIntakeCsv, validateIntakeRows } from '@/lib/intake/parse'
import type { IntakeRow } from '@/lib/intake/schema'

/**
 * Bulk intake from a standardized CSV.
 *
 * Flow:
 *   1. Parse and validate the CSV against the standard schema.
 *   2. Resolve client_name → clients.id (with alias support per the client memory).
 *   3. Resolve office_name → offices.id within that client (optional).
 *   4. Build INSERT rows and execute as a single transaction-ish RPC.
 *   5. Record one audit entry per inserted order, source='admin-bulk-intake'.
 *
 * Auth: requires an admin user. We use the admin (service-role) client for the
 * write because the standard server-side client respects RLS and we want
 * cross-client INSERTs in one shot. The actor_email comes from the session.
 */

export type IntakeResult =
  | { ok: true; created: number; orderNumbers: number[] }
  | { ok: false; error: string; invalidRows?: Array<{ line: number; errors: string[] }> }

export async function previewIntakeCsv(csvText: string): Promise<{
  validRows: { line: number; row: IntakeRow }[]
  invalidRows: { line: number; errors: string[]; raw: Record<string, string> }[]
  parseError?: string
}> {
  const parsed = parseIntakeCsv(csvText)
  if (parsed.error) return { validRows: [], invalidRows: [], parseError: parsed.error }
  const results = validateIntakeRows(parsed.rows)
  return {
    validRows: results.filter((r) => r.ok).map((r) => ({ line: r.line, row: (r as Extract<typeof r, {ok:true}>).row })),
    invalidRows: results.filter((r) => !r.ok) as Array<{ ok: false; line: number; errors: string[]; raw: Record<string, string> }>
  }
}

export async function commitIntakeCsv(csvText: string): Promise<IntakeResult> {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') return { ok: false, error: 'Admin sign-in required.' }

  const parsed = parseIntakeCsv(csvText)
  if (parsed.error) return { ok: false, error: parsed.error }
  const validated = validateIntakeRows(parsed.rows)
  const invalid = validated.filter((r) => !r.ok) as Array<{ ok: false; line: number; errors: string[]; raw: Record<string,string> }>
  if (invalid.length) {
    return {
      ok: false,
      error: `${invalid.length} row(s) failed validation. Fix them and re-upload.`,
      invalidRows: invalid.map((r) => ({ line: r.line, errors: r.errors }))
    }
  }
  const rows = validated.filter((r) => r.ok).map((r) => (r as Extract<typeof r, {ok:true}>).row)
  if (!rows.length) return { ok: false, error: 'No rows to import.' }

  const supabase = createAdminClient()

  // Resolve client_name → id (one query, then in-memory match)
  const clientNames = Array.from(new Set(rows.map((r) => r.client_name)))
  const { data: clients, error: cErr } = await supabase
    .from('clients')
    .select('id, name')
    .in('name', clientNames)
  if (cErr) return { ok: false, error: `Lookup clients failed: ${cErr.message}` }
  const clientByName = new Map(((clients ?? []) as { id: string; name: string }[]).map((c) => [c.name, c.id]))
  const unknownClients = clientNames.filter((n) => !clientByName.has(n))
  if (unknownClients.length) {
    return { ok: false, error: `Unknown clients: ${unknownClients.slice(0, 5).join(', ')}${unknownClients.length > 5 ? '…' : ''}` }
  }

  // Resolve office_name within each client
  const clientIds = Array.from(clientByName.values())
  const { data: offices } = await supabase
    .from('offices')
    .select('id, client_id, name')
    .in('client_id', clientIds)
  const officeKey = (cid: string, name: string) => `${cid}::${name.toLowerCase().trim()}`
  const officeByKey = new Map(((offices ?? []) as { id: string; client_id: string; name: string }[]).map((o) => [officeKey(o.client_id, o.name), o.id]))

  // Next order number
  const { data: maxRow } = await supabase.from('orders').select('order_number').order('order_number', { ascending: false }).limit(1).maybeSingle()
  let nextNum = (maxRow?.order_number as number | undefined ?? 0) + 1

  const insertRows = rows.map((r) => {
    const client_id = clientByName.get(r.client_name)!
    const office_id = r.office_name ? (officeByKey.get(officeKey(client_id, r.office_name)) ?? null) : null
    return {
      order_number: nextNum++,
      client_id,
      office_id,
      advisor_name: r.advisor_name,
      class_type: r.class_type,
      mailing_quantity: r.mailing_quantity,
      event_1_date: r.event_1_date,
      event_2_date: r.event_2_date || null,
      first_class_day: r.first_class_day || null,
      order_sent_deadline: r.order_sent_deadline || null,
      start_time: r.start_time || null,
      end_time: r.end_time || null,
      venue_text: r.venue_text,
      venue_address_text: r.venue_address_text,
      event_1_room: r.event_1_room || null,
      order_instructions: r.order_instructions || null,
      needs_direct_mail: true,
      dm_status: 'Pending Details' as const
    }
  })

  const { data: inserted, error: iErr } = await supabase.from('orders').insert(insertRows).select('id, order_number')
  if (iErr) return { ok: false, error: `INSERT failed: ${iErr.message}` }

  // Audit one entry per inserted order
  await recordAudit(
    ((inserted ?? []) as { id: string; order_number: number }[]).map((row, i) => ({
      table_name: 'orders',
      row_id: row.id as string,
      action: 'INSERT' as const,
      source: 'admin-bulk-intake',
      actor_email: user.email ?? null,
      after: insertRows[i]
    }))
  )

  revalidatePath('/admin/orders')
  revalidatePath('/admin')
  return {
    ok: true,
    created: inserted?.length ?? 0,
    orderNumbers: ((inserted ?? []) as { id: string; order_number: number }[]).map((r) => r.order_number)
  }
}
