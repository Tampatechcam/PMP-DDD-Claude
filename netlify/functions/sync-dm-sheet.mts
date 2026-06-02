/**
 * Scheduled Netlify Function — automatic Sheet→DB reconcile.
 *
 * Runs on a cron, fetches the Direct Mail sheet as CSV, and updates any
 * drifted field on existing DM orders (matched by order_number). Same
 * field map + guardrails as scripts/sync-from-sheet.ts, but production-safe:
 *   - reads the sheet from DM_SHEET_CSV_URL (a published-to-web CSV link)
 *   - writes via the Supabase REST API using the SERVICE_ROLE key (no
 *     Management-API/ops credential in production)
 *   - no client_id/office_id changes, no insert/delete (roster changes stay
 *     a deliberate manual step so a sheet typo can't auto-destroy a row)
 *
 * Activation: set DM_SHEET_CSV_URL in Netlify env. Until then this no-ops.
 * For a private sheet (recommended — it has client PII), swap the fetch for
 * a Google service-account read instead of publishing the sheet.
 */

import { parse } from 'csv-parse/sync'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SHEET_URL = process.env.DM_SHEET_CSV_URL

// ---- value helpers (mirror scripts/sync-from-sheet.ts) ----
const blank = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}
const getInt = (v: unknown): number | null => {
  const s = blank(v); if (!s) return null
  const m = s.replace(/[,\s]/g, '').match(/\d+/); return m ? Number(m[0]) : null
}
const MONTHS: Record<string, string> = { jan:'01',january:'01',feb:'02',february:'02',mar:'03',march:'03',apr:'04',april:'04',may:'05',jun:'06',june:'06',jul:'07',july:'07',aug:'08',august:'08',sep:'09',sept:'09',september:'09',oct:'10',october:'10',nov:'11',november:'11',dec:'12',december:'12' }
const getDate = (v: unknown): string | null => {
  const s = blank(v); if (!s) return null
  let v2 = s.replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*/i, '')
  if (/^12\/30\/1899$/.test(v2)) return null
  let m = v2.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*$/)
  if (m) { let yy = m[3]!; if (yy.length === 2) yy = '20' + yy; return `${yy}-${m[1]!.padStart(2,'0')}-${m[2]!.padStart(2,'0')}` }
  m = v2.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\s*$/)
  if (m) { const mo = MONTHS[m[1]!.toLowerCase()]; if (mo) return `${m[3] || '2026'}-${mo}-${m[2]!.padStart(2,'0')}` }
  return null
}
const getTime = (v: unknown): string | null => {
  const s = blank(v); if (!s) return null
  if (/^12\/30\/1899$/.test(s)) return null
  const m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/); if (!m) return null
  let hh = parseInt(m[1]!, 10); const mm = m[2]!; const ss = m[3] || '00'; const ap = (m[4]||'').toLowerCase()
  if (hh > 23) return null
  if (ap === 'pm' && hh < 12) hh += 12
  if (ap === 'am' && hh === 12) hh = 0
  return `${String(hh).padStart(2,'0')}:${mm}:${ss}`
}
const canonAdvisor = (name: unknown): string | null => {
  const n0 = blank(name); if (!n0) return null
  let n = n0
  if (n === 'Brian Quarnata') n = 'Brian Quaranta'
  if (n === 'FTA Chicago') n = 'FTA CHI'   // preserve the FTA Chicago→FTA CHI merge
  return n
}

type Row = Record<string, string>
type Field = { col: string; kind: 'text'|'int'|'date'|'time'|'jsonb'; read: (r: Row) => unknown }
const FIELDS: Field[] = [
  { col:'dm_status',            kind:'text', read:r=>blank(r['Status']) },
  { col:'advisor_name',         kind:'text', read:r=>canonAdvisor(r['Advisor Name']) },
  { col:'class_type',           kind:'text', read:r=>blank(r['Class Type']) },
  { col:'charity',              kind:'text', read:r=>blank(r['Charity']) },
  { col:'venue_text',           kind:'text', read:r=>blank(r['Venue Name & Room (if not different)']) },
  { col:'venue_address_text',   kind:'text', read:r=>blank(r['Venue Address']) },
  { col:'event_1_date',         kind:'date', read:r=>getDate(r['First Event date']) },
  { col:'event_1_room',         kind:'text', read:r=>blank(r['First Event Room']) },
  { col:'event_2_date',         kind:'date', read:r=>getDate(r['Second Event Date']) },
  { col:'event_2_room',         kind:'text', read:r=>blank(r['Second Event Room']) },
  { col:'event_3_date',         kind:'date', read:r=>getDate(r['Third Event date']) },
  { col:'event_3_room',         kind:'text', read:r=>blank(r['Third Event Room']) },
  { col:'event_4_date',         kind:'date', read:r=>getDate(r['Fourth Event date']) },
  { col:'event_4_room',         kind:'text', read:r=>blank(r['Fourth Event Room']) },
  { col:'start_time',           kind:'time', read:r=>getTime(r['Start Time']) },
  { col:'end_time',             kind:'time', read:r=>getTime(r['End Time']) },
  { col:'time_notes',           kind:'text', read:r=>blank(r['Start & End Time Notes (If different times)']) },
  { col:'mailing_quantity',     kind:'int',  read:r=>getInt(r['Mailing Quantity']) },
  { col:'selected_mailer_design', kind:'text', read:r=>blank(r['Selected Mailer Design']) },
  { col:'sending_list_folder_url', kind:'text', read:r=>blank(r['Order Google Folder (Sending List)']) },
  { col:'qr_code_link',         kind:'text', read:r=>blank(r['QR Code Link']) },
  { col:'client_approval_deadline', kind:'date', read:r=>getDate(r['Client Approval Deadline']) },
  { col:'order_sent_deadline',  kind:'date', read:r=>getDate(r['Order Sent Deadline']) },
  { col:'first_class_day',      kind:'date', read:r=>getDate(r['Order Sent Deadline']) },
  { col:'teledirect_added',     kind:'text', read:r=>blank(r['Teledirect Added']) },
  { col:'landing_page_url_direct', kind:'text', read:r=>blank(r['Landing Page URL']) },
  { col:'order_instructions',   kind:'text', read:r=>blank(r['Order Instructions (Always Double Click to see all Notes even if empty)']) },
  { col:'mailer_return_address_override', kind:'jsonb', read:r=>{ const v=blank(r['Mailer Return Address']); return v?{freeform:v}:null } }
]

const sheetNorm = (k: string, v: unknown) => v == null ? '∅' : k === 'jsonb' ? JSON.stringify(v) : k === 'time' ? String(v).slice(0,5) : String(v).trim()
const dbNorm = (k: string, v: unknown) => v == null ? '∅' : k === 'jsonb' ? JSON.stringify(v) : k === 'date' ? String(v).slice(0,10) : k === 'time' ? String(v).slice(0,5) : String(v).trim()

async function rest(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  })
  if (!res.ok) throw new Error(`REST ${path} → ${res.status}: ${await res.text()}`)
  return res
}

export default async () => {
  if (!SHEET_URL) { console.log('[sync-dm-sheet] DM_SHEET_CSV_URL not set — skipping.'); return new Response('skipped: no sheet url') }
  if (!SUPABASE_URL || !SERVICE_KEY) { console.error('[sync-dm-sheet] missing Supabase env'); return new Response('missing supabase env', { status: 500 }) }

  // 1. fetch the published sheet CSV
  const csvRes = await fetch(SHEET_URL)
  if (!csvRes.ok) { console.error(`[sync-dm-sheet] sheet fetch ${csvRes.status}`); return new Response('sheet fetch failed', { status: 502 }) }
  const csv = await csvRes.text()
  const rows: Row[] = parse(csv, { columns: true, skip_empty_lines: false, relax_quotes: true, relax_column_count: true, trim: false })
  const sheet = new Map<number, Row>()
  for (const r of rows) { const n = getInt(r['Order Number']); if (n != null && !sheet.has(n)) sheet.set(n, r) }

  // 2. current DM orders
  const cols = ['order_number', ...FIELDS.map(f => f.col)].join(',')
  const db: Record<string, unknown>[] = await (await rest(`orders?needs_direct_mail=eq.true&select=${cols}`)).json()
  const dbByNum = new Map<number, Record<string, unknown>>(db.map(r => [r.order_number as number, r]))

  // 3. diff + PATCH changed orders
  let changed = 0, fields = 0
  for (const [n, srow] of sheet) {
    const row = dbByNum.get(n); if (!row) continue
    const patch: Record<string, unknown> = {}
    for (const f of FIELDS) {
      const sv = f.read(srow)
      if (sheetNorm(f.kind, sv) === dbNorm(f.kind, row[f.col])) continue
      patch[f.col] = f.kind === 'int' && sv != null ? Number(sv) : sv
    }
    const keys = Object.keys(patch)
    if (!keys.length) continue
    await rest(`orders?order_number=eq.${n}&needs_direct_mail=eq.true`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch)
    })
    changed++; fields += keys.length
  }

  const msg = `[sync-dm-sheet] reconciled ${changed} orders / ${fields} fields from sheet`
  console.log(msg)
  return new Response(msg)
}

// Netlify Scheduled Function — runs hourly. Adjust cron as needed.
export const config = { schedule: '@hourly' }
