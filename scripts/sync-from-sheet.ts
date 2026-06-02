/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * sync-from-sheet.ts
 *
 * Full-field reconcile of DM orders against the Direct Mail sheet — every
 * synced column, not just status/date. Matches existing orders by
 * `order_number` and UPDATEs any field that drifted from the sheet. Does NOT
 * wipe, does NOT touch client_id/office_id (relational keys stay put), and
 * does NOT insert/delete here (roster changes are handled separately so a
 * sheet typo can't auto-destroy an order).
 *
 * Source: scripts/.import-work/direct-mail.csv (a current export of the sheet).
 * Auth:   SUPABASE_MANAGEMENT_PAT + PROJECT_REF from .env.local.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/sync-from-sheet.ts          # dry run (no writes)
 *   npx tsx --env-file=.env.local scripts/sync-from-sheet.ts --apply  # apply updates
 */

import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { join } from 'path'

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'amtunktskgwvvqumrbde'
const PAT = process.env.SUPABASE_MANAGEMENT_PAT
const APPLY = process.argv.includes('--apply')

if (!PAT) { console.error('Missing SUPABASE_MANAGEMENT_PAT (run with --env-file=.env.local)'); process.exit(1) }

async function sql(query: string): Promise<any[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  })
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${await res.text()}`)
  return (await res.json()) as any[]
}
const q = (s: string) => `'${s.replace(/'/g, "''")}'`

// ---- value helpers (mirror import-v2.ts) ----
function blank(v: string | null | undefined): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}
function getInt(v: string | null | undefined): number | null {
  const s = blank(v); if (!s) return null
  const m = s.replace(/[,\s]/g, '').match(/\d+/); return m ? Number(m[0]) : null
}
const MONTHS: Record<string, string> = { jan:'01',january:'01',feb:'02',february:'02',mar:'03',march:'03',apr:'04',april:'04',may:'05',jun:'06',june:'06',jul:'07',july:'07',aug:'08',august:'08',sep:'09',sept:'09',september:'09',oct:'10',october:'10',nov:'11',november:'11',dec:'12',december:'12' }
function getDate(v: string | null | undefined): string | null {
  const s = blank(v); if (!s) return null
  let v2 = s.replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*/i, '')
  if (/^12\/30\/1899$/.test(v2)) return null
  let m = v2.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*$/)
  if (m) { const mm = m[1]!, dd = m[2]!; let yy = m[3]!; if (yy.length === 2) yy = '20' + yy; return `${yy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}` }
  m = v2.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\s*$/)
  if (m) { const mo = MONTHS[m[1]!.toLowerCase()]; if (mo) return `${m[3] || '2026'}-${mo}-${m[2]!.padStart(2,'0')}` }
  return null
}
function getTime(v: string | null | undefined): string | null {
  const s = blank(v); if (!s) return null
  if (/^12\/30\/1899$/.test(s)) return null
  const m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/); if (!m) return null
  let hh = parseInt(m[1]!, 10); const mm = m[2]!; const ss = m[3] || '00'; const ap = (m[4]||'').toLowerCase()
  if (hh > 23) return null
  if (ap === 'pm' && hh < 12) hh += 12
  if (ap === 'am' && hh === 12) hh = 0
  return `${String(hh).padStart(2,'0')}:${mm}:${ss}`
}
function canonAdvisor(name: string | null): string | null {
  if (!name) return null
  let n = name.trim()
  if (n === 'Brian Quarnata') n = 'Brian Quaranta'
  // Preserve the deliberate "FTA Chicago → FTA CHI" merge (this session's
  // consolidation): canonicalize the sheet's spelling variant so syncing
  // advisor_name doesn't revert it.
  if (n === 'FTA Chicago') n = 'FTA CHI'
  return n
}

// ---- the synced columns: DB column -> how to read it from a sheet row ----
type FieldSpec = { col: string; kind: 'text'|'int'|'date'|'time'|'jsonb'; read: (r: Record<string,string>) => any }
const FIELDS: FieldSpec[] = [
  { col: 'dm_status',            kind:'text', read: r => blank(r['Status']) },
  { col: 'advisor_name',         kind:'text', read: r => canonAdvisor(blank(r['Advisor Name'])) },
  { col: 'class_type',           kind:'text', read: r => blank(r['Class Type']) },
  { col: 'charity',              kind:'text', read: r => blank(r['Charity']) },
  { col: 'venue_text',           kind:'text', read: r => blank(r['Venue Name & Room (if not different)']) },
  { col: 'venue_address_text',   kind:'text', read: r => blank(r['Venue Address']) },
  { col: 'event_1_date',         kind:'date', read: r => getDate(r['First Event date']) },
  { col: 'event_1_room',         kind:'text', read: r => blank(r['First Event Room']) },
  { col: 'event_2_date',         kind:'date', read: r => getDate(r['Second Event Date']) },
  { col: 'event_2_room',         kind:'text', read: r => blank(r['Second Event Room']) },
  { col: 'event_3_date',         kind:'date', read: r => getDate(r['Third Event date']) },
  { col: 'event_3_room',         kind:'text', read: r => blank(r['Third Event Room']) },
  { col: 'event_4_date',         kind:'date', read: r => getDate(r['Fourth Event date']) },
  { col: 'event_4_room',         kind:'text', read: r => blank(r['Fourth Event Room']) },
  { col: 'start_time',           kind:'time', read: r => getTime(r['Start Time']) },
  { col: 'end_time',             kind:'time', read: r => getTime(r['End Time']) },
  { col: 'time_notes',           kind:'text', read: r => blank(r['Start & End Time Notes (If different times)']) },
  { col: 'mailing_quantity',     kind:'int',  read: r => getInt(r['Mailing Quantity']) },
  { col: 'selected_mailer_design', kind:'text', read: r => blank(r['Selected Mailer Design']) },
  { col: 'sending_list_folder_url', kind:'text', read: r => blank(r['Order Google Folder (Sending List)']) },
  { col: 'qr_code_link',         kind:'text', read: r => blank(r['QR Code Link']) },
  { col: 'client_approval_deadline', kind:'date', read: r => getDate(r['Client Approval Deadline']) },
  { col: 'order_sent_deadline',  kind:'date', read: r => getDate(r['Order Sent Deadline']) },
  { col: 'first_class_day',      kind:'date', read: r => getDate(r['Order Sent Deadline']) },
  { col: 'teledirect_added',     kind:'text', read: r => blank(r['Teledirect Added']) },
  { col: 'landing_page_url_direct', kind:'text', read: r => blank(r['Landing Page URL']) },
  { col: 'order_instructions',   kind:'text', read: r => blank(r['Order Instructions (Always Double Click to see all Notes even if empty)']) },
  { col: 'mailer_return_address_override', kind:'jsonb', read: r => { const v = blank(r['Mailer Return Address']); return v ? { freeform: v } : null } }
]

function norm(kind: string, v: any): string {
  if (v == null) return '∅'
  if (kind === 'jsonb') return JSON.stringify(v)
  if (kind === 'time') return String(v).slice(0,5)        // compare HH:MM
  return String(v).trim()
}
function dbNorm(kind: string, v: any): string {
  if (v == null) return '∅'
  if (kind === 'jsonb') return JSON.stringify(v)
  if (kind === 'date') return String(v).slice(0,10)
  if (kind === 'time') return String(v).slice(0,5)
  return String(v).trim()
}

async function main(): Promise<void> {
  console.log(`=== Sheet→DB full-field reconcile ${APPLY ? '(APPLY)' : '(dry run)'} ===\n`)

  const raw = readFileSync(join(process.cwd(), 'scripts', '.import-work', 'direct-mail.csv'), 'utf8')
  const rows: Record<string,string>[] = parse(raw, { columns:true, skip_empty_lines:false, relax_quotes:true, relax_column_count:true, trim:false })
  const sheet = new Map<number, Record<string,string>>()
  for (const r of rows) { const n = getInt(r['Order Number']); if (n != null && !sheet.has(n)) sheet.set(n, r) }
  console.log(`sheet: ${sheet.size} numbered orders`)

  const cols = FIELDS.map(f => f.col).join(', ')
  const dbRows = await sql(`SELECT order_number, ${cols} FROM orders WHERE needs_direct_mail = true`)
  const dbByNum = new Map<number, any>(dbRows.map((r:any) => [r.order_number, r]))
  console.log(`db: ${dbRows.length} DM orders\n`)

  const updates: { n: number; sets: string[]; changes: string[] }[] = []
  for (const [n, srow] of sheet) {
    const db = dbByNum.get(n); if (!db) continue   // not in DB = roster add, handled elsewhere
    const sets: string[] = []; const changes: string[] = []
    for (const f of FIELDS) {
      const sv = f.read(srow)
      if (norm(f.kind, sv) === dbNorm(f.kind, db[f.col])) continue
      changes.push(`${f.col}: ${dbNorm(f.kind, db[f.col])} → ${norm(f.kind, sv)}`)
      if (sv == null) sets.push(`${f.col} = NULL`)
      else if (f.kind === 'int') sets.push(`${f.col} = ${Number(sv)}`)
      else if (f.kind === 'jsonb') sets.push(`${f.col} = ${q(JSON.stringify(sv))}::jsonb`)
      else sets.push(`${f.col} = ${q(String(sv))}`)
    }
    if (sets.length) updates.push({ n, sets, changes })
  }

  console.log(`${updates.length} orders have field drift:\n`)
  for (const u of updates) {
    console.log(`  #${u.n}`)
    for (const c of u.changes) console.log(`      ${c}`)
  }

  if (!updates.length) { console.log('\nNothing to update — DB already matches the sheet.'); return }
  if (!APPLY) { console.log(`\n(dry run — re-run with --apply to write ${updates.reduce((a,u)=>a+u.sets.length,0)} field updates across ${updates.length} orders)`); return }

  const stmts = updates.map(u => `UPDATE orders SET ${u.sets.join(', ')} WHERE order_number = ${u.n} AND needs_direct_mail = true;`)
  await sql(['BEGIN;', ...stmts, 'COMMIT;'].join('\n'))
  console.log(`\nApplied: ${updates.length} orders updated.`)
}

main().catch(e => { console.error('Failed:', e); process.exit(1) })
