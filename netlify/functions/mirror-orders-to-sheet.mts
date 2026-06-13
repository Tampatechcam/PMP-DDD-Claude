/**
 * Scheduled Netlify Function — Supabase → Direct Mail sheet MIRROR (append-only).
 *
 * The reverse of sync-dm-sheet. Orders now originate in Supabase (e.g. the
 * email→order agent inserts them); this pushes any order that isn't yet in the
 * Direct Mail sheet INTO the sheet, so the sheet-based workflow (Ops Command
 * Center dash, printer handoff) sees it. Runs every 15 minutes.
 *
 * SAFETY (it writes the master sheet, so it's deliberately conservative):
 *   - APPEND-ONLY. Matches by order_number; only orders missing from the sheet
 *     are appended. It NEVER edits or deletes an existing row — humans own those.
 *   - DRY-RUN by default. It logs what it *would* append and writes nothing
 *     until MIRROR_LIVE === 'true'. Flip that only after a dry-run looks right.
 *   - Guards against mass-duplication: if the sheet read returns 0 existing
 *     order numbers (a likely auth/range failure), or if more than MAX_APPEND
 *     rows would be added, it aborts without writing.
 *   - Pairs cleanly with sync-dm-sheet: that one PATCHes existing rows
 *     (sheet→DB); this one only APPENDS new rows (DB→sheet). No loop. Keep the
 *     hourly sheet→DB sync OFF if Supabase is the source of truth.
 *
 * Required env (Netlify):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (read orders)
 *   GOOGLE_SA_KEY    full service-account JSON (the SA must be shared as Editor
 *                    on the sheet; Google Sheets API enabled)
 *   DM_SHEET_ID      the Direct Mail sheet id
 *   MIRROR_LIVE      "true" to actually write; anything else = dry-run (default)
 *   MAX_APPEND       optional cap, default 25
 */

import { createSign } from 'node:crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SA_KEY = process.env.GOOGLE_SA_KEY
const DM_SHEET_ID = process.env.DM_SHEET_ID
const LIVE = process.env.MIRROR_LIVE === 'true'
const MAX_APPEND = Number(process.env.MAX_APPEND ?? '25')

// ---- formatting (match how rows are entered by hand in the sheet) ----
const s = (v: unknown): string => (v == null ? '' : String(v))
const fmtDate = (v: unknown): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s(v))
  return m ? `${Number(m[2])}/${Number(m[3])}/${m[1]}` : s(v) // 2026-06-29 -> 6/29/2026
}
const fmtTime = (v: unknown): string => {
  const m = /^(\d{1,2}):(\d{2})/.exec(s(v))
  if (!m) return s(v)
  let hh = Number(m[1]); const mm = m[2]
  const ap = hh >= 12 ? 'PM' : 'AM'; hh = hh % 12; if (hh === 0) hh = 12
  return `${hh}:${mm} ${ap}` // 18:00:00 -> 6:00 PM
}
const returnAddr = (o: Order): string => {
  const ov = o.mailer_return_address_override?.freeform
  const off = o.offices?.mailer_return_address?.freeform
  return s(ov ?? off ?? '')
}

type Addr = { freeform?: string } | null
type Order = {
  order_number: number
  dm_status: string | null
  advisor_name: string | null
  market: string | null
  charity: string | null
  venue_text: string | null
  venue_address_text: string | null
  event_1_date: string | null; event_1_room: string | null
  event_2_date: string | null; event_2_room: string | null
  event_3_date: string | null; event_3_room: string | null
  event_4_date: string | null; event_4_room: string | null
  start_time: string | null; end_time: string | null; time_notes: string | null
  mailing_quantity: number | null
  selected_mailer_design: string | null
  mailer_return_address_override: Addr
  qr_code_link: string | null
  sending_list_folder_url: string | null
  client_approval_deadline: string | null
  order_sent_deadline: string | null
  first_class_day: string | null
  teledirect_added: string | null
  landing_page_url_direct: string | null
  order_instructions: string | null
  class_type: string | null
  clients: { name: string | null } | null
  offices: {
    name: string | null
    state: string | null
    registration_phone: string | null
    mailer_return_address: Addr
  } | null
}

/** Direct Mail sheet row, columns A→AF (see memory/context/sheets.md). */
function toRow(o: Order): string[] {
  return [
    s(o.dm_status),                                   // A  Status
    s(o.order_number),                                // B  Order Number
    s(o.advisor_name),                                // C  Advisor Name
    s(o.clients?.name),                               // D  Group Name
    s(o.offices?.name ?? o.offices?.state ?? o.market), // E  Office Location
    fmtDate(o.client_approval_deadline),              // F  Client Approval Deadline
    fmtDate(o.order_sent_deadline),                   // G  Order Sent Deadline
    fmtDate(o.first_class_day),                       // H  First Class Day
    s(o.teledirect_added),                            // I  Teledirect Added
    s(o.venue_text),                                  // J  Venue Name & Room
    s(o.venue_address_text),                          // K  Venue Address
    fmtDate(o.event_1_date),                          // L  First Event date
    s(o.event_1_room),                                // M  First Event Room
    fmtDate(o.event_2_date),                          // N  Second Event Date
    s(o.event_2_room),                                // O  Second Event Room
    s(o.order_instructions),                          // P  Order Instructions
    s(o.charity),                                     // Q  Charity
    s(o.landing_page_url_direct),                     // R  Landing Page URL
    s(o.offices?.registration_phone),                 // S  Registration Phone Number
    s(o.class_type),                                  // T  Class Type
    s(o.qr_code_link),                                // U  QR Code Link
    s(o.sending_list_folder_url),                     // V  Order Google Folder
    s(o.selected_mailer_design),                      // W  Selected Mailer Design
    returnAddr(o),                                    // X  Mailer Return Address
    s(o.mailing_quantity),                            // Y  Mailing Quantity
    fmtTime(o.start_time),                            // Z  Start Time
    fmtTime(o.end_time),                              // AA End Time
    s(o.time_notes),                                  // AB Start & End Time Notes
    fmtDate(o.event_3_date),                          // AC Third Event date
    s(o.event_3_room),                                // AD Third Event Room
    fmtDate(o.event_4_date),                          // AE Fourth Event date
    s(o.event_4_room)                                 // AF Fourth Event Room
  ]
}

// ---- Google service-account auth (JWT → access token), no extra deps ----
async function googleToken(): Promise<string> {
  const sa = JSON.parse(SA_KEY!)
  const now = Math.floor(Date.now() / 1000)
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })}`
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url')
  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${sig}`
    })
  })
  if (!res.ok) throw new Error(`google token ${res.status}: ${await res.text()}`)
  return (await res.json()).access_token as string
}

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets'

/** First tab title — values reads/appends target it explicitly. */
async function firstTabTitle(token: string): Promise<string> {
  const res = await fetch(`${SHEETS}/${DM_SHEET_ID}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`sheet meta ${res.status}: ${await res.text()}`)
  const title = (await res.json())?.sheets?.[0]?.properties?.title
  if (!title) throw new Error('no sheet tab found')
  return title
}

export default async () => {
  if (!SUPABASE_URL || !SERVICE_KEY || !SA_KEY || !DM_SHEET_ID) {
    console.log('[mirror] missing env (need SUPABASE url/key, GOOGLE_SA_KEY, DM_SHEET_ID) — skipping.')
    return new Response('skipped: missing env')
  }

  // 1. Orders from Supabase (service role bypasses RLS, same as sync-dm-sheet)
  const select =
    'order_number,dm_status,advisor_name,market,charity,venue_text,venue_address_text,' +
    'event_1_date,event_1_room,event_2_date,event_2_room,event_3_date,event_3_room,event_4_date,event_4_room,' +
    'start_time,end_time,time_notes,mailing_quantity,selected_mailer_design,mailer_return_address_override,' +
    'qr_code_link,sending_list_folder_url,client_approval_deadline,order_sent_deadline,first_class_day,' +
    'teledirect_added,landing_page_url_direct,order_instructions,class_type,' +
    'clients(name),offices(name,state,registration_phone,mailer_return_address)'
  const ordRes = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?needs_direct_mail=eq.true&order_number=not.is.null&select=${select}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  if (!ordRes.ok) { console.error(`[mirror] supabase ${ordRes.status}`); return new Response('supabase read failed', { status: 502 }) }
  const orders: Order[] = await ordRes.json()

  // 2. Google auth + the sheet's existing order numbers (column B)
  const token = await googleToken()
  const tab = await firstTabTitle(token)
  const range = `'${tab.replace(/'/g, "''")}'!B2:B`
  const valRes = await fetch(`${SHEETS}/${DM_SHEET_ID}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!valRes.ok) { console.error(`[mirror] sheet read ${valRes.status}`); return new Response('sheet read failed', { status: 502 }) }
  const existingRows: string[][] = (await valRes.json()).values ?? []
  const existing = new Set<number>()
  for (const r of existingRows) { const n = Number(String(r?.[0] ?? '').replace(/[,\s]/g, '')); if (Number.isInteger(n) && n > 0) existing.add(n) }

  // 3. Safety: a 0-count read almost certainly means a read failure, not an
  //    empty sheet — appending now would duplicate the entire order book.
  if (existing.size === 0) {
    console.error('[mirror] ABORT: read 0 existing order numbers from the sheet — refusing to append (likely a range/auth problem).')
    return new Response('abort: 0 existing rows read', { status: 500 })
  }

  // 4. Orders missing from the sheet, by order_number
  const missing = orders.filter((o) => !existing.has(o.order_number)).sort((a, b) => a.order_number - b.order_number)
  if (missing.length === 0) { console.log(`[mirror] in sync — ${existing.size} rows in sheet, nothing to append.`); return new Response('in sync') }

  if (missing.length > MAX_APPEND) {
    console.error(`[mirror] ABORT: ${missing.length} orders missing (> MAX_APPEND=${MAX_APPEND}). Review before a bulk append: ${missing.map((o) => o.order_number).join(', ')}`)
    return new Response(`abort: ${missing.length} > MAX_APPEND`, { status: 409 })
  }

  const rows = missing.map(toRow)

  // 5. Dry-run unless explicitly live
  if (!LIVE) {
    console.log(`[mirror] DRY-RUN — would append ${rows.length} order(s) to '${tab}': ${missing.map((o) => o.order_number).join(', ')}`)
    console.log('[mirror] first row preview:', JSON.stringify(rows[0]))
    return new Response(`dry-run: would append ${rows.length} (set MIRROR_LIVE=true to write)`)
  }

  // 6. Append (USER_ENTERED so dates/numbers parse like hand entry)
  const appendRange = `'${tab.replace(/'/g, "''")}'!A:AF`
  const appRes = await fetch(
    `${SHEETS}/${DM_SHEET_ID}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: rows }) }
  )
  if (!appRes.ok) { console.error(`[mirror] append ${appRes.status}: ${await appRes.text()}`); return new Response('append failed', { status: 502 }) }

  const msg = `[mirror] appended ${rows.length} order(s) to '${tab}': ${missing.map((o) => o.order_number).join(', ')}`
  console.log(msg)
  return new Response(msg)
}

// Netlify Scheduled Function — every 15 minutes.
export const config = { schedule: '*/15 * * * *' }
