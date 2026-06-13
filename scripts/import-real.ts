/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Real PMP data importer.
 *
 * Source of truth lives in `scripts/.import-work/*.md` — markdown extracted
 * from the six Google Drive sheets (Client Dictionary, Creative Dictionary,
 * Main Order Sheet, Direct Mail Sheet, Digital Jobs Sheet, Invoice Sheet).
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/import-real.ts
 *
 * The script:
 *   1. Parses the six markdown tables into structured arrays.
 *   2. Deduplicates clients (one row per FMO group: FTA / Sentinel SAM RIA /
 *      AdvisorMax / Arrive Financial Services; one row per independent firm).
 *   3. Builds office rows per client based on the firm's advisor list.
 *   4. Inserts in dependency order: clients -> offices -> venues -> orders ->
 *      invoices -> order_events.
 *   5. Logs anything that couldn't be mapped to scripts/.import-work/unmapped.log.jsonl.
 *
 * It assumes the DB was wiped beforehand (see the README in this directory).
 *
 * Grouping rules (ADR 0004):
 *   - GROUP clients (is_group=true, advisors -> offices):
 *       FTA, Sentinel/SAM RIA, AdvisorMax, Arrive Financial Services
 *     (Arrive variants collapse into one client per the import instructions.)
 *   - INDEPENDENT firms: one clients row, one implicit "Main" office.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, appendFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
// Node 20 lacks native WebSocket; supabase-js needs `ws` to initialize.
// @ts-ignore — ws is not part of devDependencies; installed transiently.
import WebSocket from 'ws'
// @ts-ignore — patch global
;(globalThis as any).WebSocket = WebSocket

// ---------- env ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  // Disable realtime so the WebSocket doesn't open connections we don't need.
  realtime: { params: {} } as any
})

const W = join(process.cwd(), 'scripts', '.import-work')
const UNMAPPED_LOG = join(W, 'unmapped.log.jsonl')
if (existsSync(UNMAPPED_LOG)) unlinkSync(UNMAPPED_LOG)
// Create empty file up-front so the path always exists even when nothing failed.
writeFileSync(UNMAPPED_LOG, '')

function logUnmapped(payload: Record<string, unknown>) {
  appendFileSync(UNMAPPED_LOG, JSON.stringify(payload) + '\n')
}

// ---------- markdown helpers ----------
type TableCells = string[][]

function readMd(name: string): string {
  return readFileSync(join(W, name), 'utf8')
}

function unesc(s: string | null | undefined): string | null {
  if (s == null) return null
  const out = String(s)
    .replace(/\\([\\#&_\[\]\-{}.()])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return out
}

function blank(v: string | null | undefined): string | null {
  if (v == null) return null
  const s = String(v).trim()
  if (s === '' || s === '-' || s === '\\-' || s === 'N/A' || s === 'n/a' || s === 'TBD') return null
  return s
}

function getMoney(v: string | null | undefined): number | null {
  const s = blank(v)
  if (!s) return null
  const m = s.replace(/[,$\s]/g, '').match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

function getInt(v: string | null | undefined): number | null {
  const s = blank(v)
  if (!s) return null
  const m = s.replace(/[,\s]/g, '').match(/\d+/)
  return m ? Number(m[0]) : null
}

function getBool(v: string | null | undefined): boolean | null {
  const s = blank(v)
  if (!s) return null
  const l = s.toLowerCase()
  if (l === 'true' || l === 'yes' || l === 'y') return true
  if (l === 'false' || l === 'no' || l === 'n') return false
  return null
}

const MONTHS: Record<string, string> = {
  jan: '01', january: '01', feb: '02', february: '02',
  mar: '03', march: '03', apr: '04', april: '04',
  may: '05', jun: '06', june: '06', jul: '07', july: '07',
  aug: '08', august: '08', sep: '09', sept: '09', september: '09',
  oct: '10', october: '10', nov: '11', november: '11',
  dec: '12', december: '12'
}

function getDate(v: string | null | undefined): string | null {
  const s = blank(v)
  if (!s) return null
  let v2 = unesc(s)!
  v2 = v2.replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*/i, '')
  // MM/DD/YYYY
  let m = v2.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*$/)
  if (m) {
    let yy = m[3]
    if (yy.length === 2) yy = '20' + yy
    return `${yy}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`
  }
  // "January 6, 2026"
  m = v2.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\s*$/)
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()]
    if (mon) {
      const yr = m[3] || '2026'
      return `${yr}-${mon}-${String(m[2]).padStart(2, '0')}`
    }
  }
  // "January 6"
  m = v2.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*$/)
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()]
    if (mon) return `2026-${mon}-${String(m[2]).padStart(2, '0')}`
  }
  return null
}

function getTime(v: string | null | undefined): string | null {
  const s = blank(v)
  if (!s) return null
  const m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/)
  if (!m) return null
  let hh = parseInt(m[1], 10)
  const mm = m[2]
  const ss = m[3] || '00'
  const ampm = (m[4] || '').toLowerCase()
  if (ampm === 'pm' && hh < 12) hh += 12
  if (ampm === 'am' && hh === 12) hh = 0
  return `${String(hh).padStart(2, '0')}:${mm}:${ss}`
}

function parseTable(md: string): { header: string[]; rows: TableCells } {
  const lines = md.split('\n').map(l => l.trimEnd()).filter(l => l.startsWith('|'))
  if (!lines.length) return { header: [], rows: [] }
  const cells = (line: string) => line.split('|').slice(1, -1).map(s => s.trim())
  const header = cells(lines[0])
  const rows: TableCells = []
  for (let i = 1; i < lines.length; i++) {
    const c = cells(lines[i])
    if (c.every(x => /^[-: ]+$/.test(x))) continue
    rows.push(c)
  }
  return { header, rows }
}

// ---------- grouping rules (ADR 0004) ----------
type ClientKind = 'group' | 'firm'
interface ClientBucket {
  kind: ClientKind
  name: string // canonical client name (e.g. "FTA", "Scout Financial Group")
}

// Independent-firm name aliases — different sheets use different spellings.
// Map every observed variant to a single canonical client name.
const INDEPENDENT_FIRM_ALIASES: Record<string, string> = {
  'scout financial': 'Scout Financial Group',
  'scout financial group': 'Scout Financial Group',
  'bone asset': 'Bone Asset Management',
  'bone asset management': 'Bone Asset Management',
  'top rank advisors': 'Top Rank Advisors, LLC',
  'top rank advisors, llc': 'Top Rank Advisors, LLC',
  'damian sylvia': 'Damian J Sylvia Financial Solutions',
  'damian j sylvia financial solutions': 'Damian J Sylvia Financial Solutions',
  'kelly capital partners': 'Copper Partners II DBA Kelly Capital Partners',
  'copper partners ii dba kelly capital partners': 'Copper Partners II DBA Kelly Capital Partners',
  'the otoole group': "The O'Toole Group",
  "the o'toole group": "The O'Toole Group",
  'eagle financial solutions': 'Eagle Financial Solutions',
  'advanced wealth management': 'Advanced Wealth Management',
  'avinci wealth management': 'Avinci Wealth Management',
  'mason street wealth management': 'Mason Street Wealth Management',
  'mcguire insurance & retirement solutions': 'McGuire Insurance & Retirement Solutions',
  'ferguson wealth & insurance solutions, llc.': 'Ferguson Wealth & Insurance Solutions, LLC.',
  'ferguson wealth & insurance solutions': 'Ferguson Wealth & Insurance Solutions, LLC.',
  // Group_name = "Andy Urso" in the DM sheet maps to the AdvisorMax client
  // — handled separately below via advisor lookup.
  'forecast estate planning': 'Forecast Estate Planning',
  'professional group, inc.': 'Professional Group, Inc.',
  'michael foguth financial group llc': 'Michael Foguth Financial Group LLC',
  'barnett financial & tax': 'Barnett Financial & Tax',
  'proper retirement, llc': 'Proper Retirement, LLC',
  'strategic asset preservation, inc.': 'Strategic Asset Preservation, Inc.',
  'help to retire': 'Help To Retire',
  'ideal retirement solutions llc': 'Ideal Retirement Solutions LLC'
}

// Advisor names that should never resolve to themselves as the client when
// they appear as group_name — they live inside a known group client.
// (e.g. "Andy Urso" in DM sheet group column = AdvisorMax client)
const ADVISOR_TO_GROUP_OVERRIDE: Record<string, string> = {
  'andy urso': 'AdvisorMax'
}

function classifyClient(rawGroup: string | null, advisorName: string | null): ClientBucket {
  const g = (rawGroup || '').trim()
  const gLower = g.toLowerCase()

  // FTA aliases
  if (
    gLower === 'fta' ||
    gLower.startsWith('fta ') ||
    gLower.startsWith('fta-') ||
    gLower === 'financial tax architects' ||
    gLower === 'financial & tax architects' ||
    gLower.includes('financial & tax architects') ||
    gLower.includes('financial tax architects') ||
    // FTA office labels that show up as group_name in DM sheet
    gLower === 'southern illinois'
  ) {
    return { kind: 'group', name: 'FTA' }
  }

  // Sentinel/SAM RIA aliases
  if (
    gLower === 'sam ria' ||
    gLower.startsWith('sam ria') ||
    gLower.startsWith('sam-ria') ||
    gLower === 'sentinel' ||
    gLower.includes('sam ria') ||
    gLower.includes('sentinel asset management')
  ) {
    return { kind: 'group', name: 'Sentinel/SAM RIA' }
  }

  // AdvisorMax aliases
  if (gLower === 'advisormax' || gLower === 'advisor max' || gLower === 'advisormax, llc') {
    return { kind: 'group', name: 'AdvisorMax' }
  }

  // Arrive Financial Services collapse (any "arrive ..." variant)
  if (gLower.startsWith('arrive ') || gLower === 'arrive') {
    return { kind: 'group', name: 'Arrive Financial Services' }
  }

  // Advisor-name override (e.g. "Andy Urso" -> AdvisorMax)
  if (gLower in ADVISOR_TO_GROUP_OVERRIDE) {
    return { kind: 'group', name: ADVISOR_TO_GROUP_OVERRIDE[gLower] }
  }
  if (advisorName && advisorName.toLowerCase() in ADVISOR_TO_GROUP_OVERRIDE) {
    return { kind: 'group', name: ADVISOR_TO_GROUP_OVERRIDE[advisorName.toLowerCase()] }
  }

  // Independent firm: canonicalize via alias table
  if (g) {
    const canon = INDEPENDENT_FIRM_ALIASES[gLower]
    return { kind: 'firm', name: canon || g }
  }
  if (advisorName) {
    const aLower = advisorName.toLowerCase()
    const canon = INDEPENDENT_FIRM_ALIASES[aLower]
    return { kind: 'firm', name: canon || advisorName.trim() }
  }
  return { kind: 'firm', name: 'Unknown' }
}

const GROUP_CLIENT_NAMES = new Set([
  'FTA',
  'Sentinel/SAM RIA',
  'AdvisorMax',
  'Arrive Financial Services'
])

// ---------- 1. Parse Client Dictionary (TWO sub-tables) ----------
interface RawClientRow {
  advisor_name: string | null
  fmo: string | null
  advisors_list: string | null
  responsibility: string | null
  is_non_profit: boolean
  business_name: string | null
  business_website: string | null
  business_address: string | null
  business_city: string | null
  business_state: string | null
  mailer_return_address: string | null
  registration_phone: string | null
  registration_url_direct: string | null
  registration_url_digital: string | null
  ein: string | null
  ein_match_name: string | null
  disclaimer: string | null
  description: string | null
  notes: string | null
  main_contact_name: string | null
  main_contact_email: string | null
  main_contact_phone: string | null
  main_contact_position: string | null
  secondary_contact_name: string | null
  secondary_contact_email: string | null
  secondary_contact_phone: string | null
  secondary_contact_position: string | null
  cc_emails: string | null
  preferred_mailer_topics: string | null
  mailer_type: string | null
  order_instructions: string | null
  default_mailer_rate: number | null
  default_mailing_quantity: number | null
  default_digital_budget: number | null
  tech_sequences: string | null
  direct_mail_discount: string | null
  start_before_paid: boolean | null
}

function parseClientDict(): RawClientRow[] {
  const md = readMd('client-dict.md')
  const lines = md.split('\n').filter(l => l.startsWith('|'))
  const cells = (l: string) => l.split('|').slice(1, -1).map(s => s.trim())
  // Find the two header rows
  const headerIdx: number[] = []
  lines.forEach((l, i) => {
    if (l.startsWith('| Advisor Name |')) headerIdx.push(i)
  })
  if (headerIdx.length < 1) throw new Error('Could not locate Client Dict header')

  const parseSection = (start: number, end: number) => {
    const section = lines.slice(start, end)
    const header = cells(section[0])
    const rows: TableCells = []
    for (let i = 1; i < section.length; i++) {
      const c = cells(section[i])
      if (c.every(x => /^[-: ]+$/.test(x))) continue
      // Skip blank-advisor rows
      if (!c[0] || !c[0].trim()) continue
      rows.push(c)
    }
    return { header, rows }
  }

  const sec1 = parseSection(headerIdx[0], headerIdx[1] ?? lines.length)
  const sec2 = headerIdx[1] != null
    ? parseSection(headerIdx[1], lines.length)
    : { header: [] as string[], rows: [] as TableCells }

  const buildRow = (header: string[], r: string[]): RawClientRow => {
    const get = (h: string): string | null => {
      const idx = header.indexOf(h)
      return idx < 0 ? null : unesc(blank(r[idx]))
    }
    const getRaw = (h: string): string | null => {
      const idx = header.indexOf(h)
      return idx < 0 ? null : r[idx]
    }
    return {
      advisor_name: get('Advisor Name'),
      fmo: get('FMO/Group Name (Optional)'),
      advisors_list: get('Advisors'),
      responsibility: get('Responsibility'),
      is_non_profit: get('Non-Profit Status') === 'Yes',
      business_name: get('Business Name'),
      business_website: get('Business Website'),
      business_address: get('Business Address'),
      business_city: get('Business City'),
      business_state: get('Business State'),
      mailer_return_address: get('Mailer Return Address'),
      registration_phone: get('Registration Phone number'),
      registration_url_direct: get('Website Registration (Direct)'),
      registration_url_digital: get('Website Registration (Digital)'),
      ein: get('EIN'),
      ein_match_name: get('Company Name (EIN Match)'),
      disclaimer: get('Disclaimer'),
      description: get('Description of Client'),
      notes: get('Client Notes to Lookout for'),
      main_contact_name: get('Main Contact Name'),
      main_contact_email: get('Main Contact Email'),
      main_contact_phone: get('Main Contact Phone'),
      main_contact_position: get('Main Contact Job Position'),
      secondary_contact_name: get('Secondary Contact Name'),
      secondary_contact_email: get('Secondary Contact Email'),
      secondary_contact_phone: get('Secondary Contact Phone'),
      secondary_contact_position: get('Secondary Contact Job Position'),
      cc_emails: get('CC Emails to add'),
      preferred_mailer_topics: get('Perferred Mailer Topics'),
      mailer_type: get('Mailer Type Used'),
      order_instructions: get('Order Instructions'),
      default_mailer_rate: getMoney(getRaw('Direct Mailer Rate (per, QA Always)')),
      default_mailing_quantity: getInt(getRaw('Usual Mailing Quanity (QA Always)')),
      default_digital_budget: getMoney(getRaw('Default Digital Marketing Budget (QA Always)')),
      tech_sequences: get('Tech/Sequences'),
      direct_mail_discount: get('Any Direct Mail Discounts'),
      start_before_paid: getBool(getRaw('Start Orders Before Being Paid'))
    }
  }

  const s1Rows = sec1.rows
    .filter(r => r[0] && r[0].trim() && r[0].trim() !== 'Advisor Name')
    .map(r => buildRow(sec1.header, r))
  const s2Rows = sec2.rows
    .filter(r => r[0] && r[0].trim() && r[0].trim() !== 'Advisor Name')
    .map(r => buildRow(sec2.header, r))

  // Merge: section 2 fills in nulls in section 1 for the same advisor_name.
  const merged = new Map<string, RawClientRow>()
  for (const r of s1Rows) {
    if (!r.advisor_name) continue
    merged.set(r.advisor_name, r)
  }
  for (const r of s2Rows) {
    if (!r.advisor_name) continue
    const existing = merged.get(r.advisor_name)
    if (!existing) {
      merged.set(r.advisor_name, r)
      continue
    }
    // Fill in nulls
    for (const k of Object.keys(r) as (keyof RawClientRow)[]) {
      const v = r[k] as unknown
      if (v != null && v !== '') {
        if ((existing as any)[k] == null || (existing as any)[k] === '') {
          ;(existing as any)[k] = v
        }
      }
    }
  }
  return [...merged.values()]
}

// ---------- 2. Parse Main Order Sheet ----------
interface RawMainOrder {
  main_status: string | null
  added_to_sheets: string | null
  order_number: number | null
  responsibility: string | null
  advisor_name: string | null
  group_name: string | null
  first_event_date: string | null
  needs_direct_mail: boolean | null
  needs_digital: boolean | null
  needs_google_sheet: boolean | null
  market: string | null
  office_location: string | null
  charity: string | null
  class_type: string | null
  mailing_quantity: number | null
  mailer_type: string | null
  mailer_return_address: string | null
  digital_budget: number | null
  landing_page_url_direct: string | null
  landing_page_url_digital: string | null
  venue_text: string | null
  venue_address_text: string | null
  start_time: string | null
  end_time: string | null
  time_notes: string | null
  event_1_date: string | null
  event_1_room: string | null
  event_2_date: string | null
  event_2_room: string | null
  event_3_date: string | null
  event_3_room: string | null
  event_4_date: string | null
  event_4_room: string | null
}

function parseMainOrders(): RawMainOrder[] {
  const { header, rows } = parseTable(readMd('main-order.md'))
  return rows
    .map(r => {
      const get = (h: string): string | null => {
        const i = header.indexOf(h)
        return i < 0 ? null : unesc(blank(r[i]))
      }
      const getRaw = (h: string): string | null => {
        const i = header.indexOf(h)
        return i < 0 ? null : r[i]
      }
      // Status is the first (empty-header) column
      const statusCol = unesc(blank(r[0]))
      return {
        main_status: statusCol,
        added_to_sheets: get('Added to Sheets'),
        order_number: getInt(getRaw('Order Number')),
        responsibility: get('Responsibilty'),
        advisor_name: get('Advisor Name'),
        group_name: get('Group Name'),
        first_event_date: getDate(getRaw('First Event Date')),
        needs_direct_mail: getBool(getRaw('Needs Direct Mail')),
        needs_digital: getBool(getRaw('Needs Digital')),
        needs_google_sheet: getBool(getRaw('Needs Google Sheet')),
        market: get('Market'),
        office_location: get('Office Location'),
        charity: get('Charity'),
        class_type: get('Class Type'),
        mailing_quantity: getInt(getRaw('Mailing Quantity')),
        mailer_type: get('Mailer Type'),
        mailer_return_address: get('Mailer Return Address'),
        digital_budget: getMoney(getRaw('Digital Budget to Invoice')),
        landing_page_url_direct: get('Landing Page URL (Direct)'),
        landing_page_url_digital: get('Landing Page URL (Digital)'),
        venue_text: get('Venue Name & Room (if not different)'),
        venue_address_text: get('Venue Address'),
        start_time: getTime(getRaw('Start Time')),
        end_time: getTime(getRaw('End Time')),
        time_notes: get('Notes (Start & End Time If different times)'),
        event_1_date: getDate(getRaw('First Event date')),
        event_1_room: get('First Event Room'),
        event_2_date: getDate(getRaw('Second Event Date')),
        event_2_room: get('Second Event Room'),
        event_3_date: getDate(getRaw('Third Event date')),
        event_3_room: get('Third Event Room'),
        event_4_date: getDate(getRaw('Fourth Event date')),
        event_4_room: get('Fourth Event Room')
      }
    })
    .filter(r => r.order_number != null)
}

// ---------- 3. Parse Direct Mail Sheet ----------
interface RawDM {
  dm_status: string | null
  order_number: number | null
  advisor_name: string | null
  group_name: string | null
  office_location: string | null
  client_approval_deadline: string | null
  order_sent_deadline: string | null
  first_class_day: string | null
  teledirect_added: string | null
  venue_text: string | null
  venue_address_text: string | null
  event_1_date: string | null
  event_1_room: string | null
  event_2_date: string | null
  event_2_room: string | null
  event_3_date: string | null
  event_3_room: string | null
  event_4_date: string | null
  event_4_room: string | null
  order_instructions: string | null
  charity: string | null
  landing_page_url: string | null
  registration_phone: string | null
  class_type: string | null
  qr_code_link: string | null
  sending_list_folder_url: string | null
  selected_mailer_design: string | null
  mailer_return_address: string | null
  mailing_quantity: number | null
  start_time: string | null
  end_time: string | null
  time_notes: string | null
}

function parseDirectMail(): RawDM[] {
  const { header, rows } = parseTable(readMd('direct-mail.md'))
  return rows
    .map(r => {
      const get = (h: string): string | null => {
        const i = header.indexOf(h)
        return i < 0 ? null : unesc(blank(r[i]))
      }
      const getRaw = (h: string): string | null => {
        const i = header.indexOf(h)
        return i < 0 ? null : r[i]
      }
      const statusCol = unesc(blank(r[0]))
      return {
        dm_status: get('Status') || statusCol,
        order_number: getInt(getRaw('Order Number')),
        advisor_name: get('Advisor Name'),
        group_name: get('Group Name'),
        office_location: get('Office Location'),
        client_approval_deadline: getDate(getRaw('Client Approval Deadline')),
        order_sent_deadline: getDate(getRaw('Order Sent Deadline')),
        first_class_day: getDate(getRaw('First Class Day')),
        teledirect_added: get('Teledirect Added'),
        venue_text: get('Venue Name & Room (if not different)'),
        venue_address_text: get('Venue Address'),
        event_1_date: getDate(getRaw('First Event date')),
        event_1_room: get('First Event Room'),
        event_2_date: getDate(getRaw('Second Event Date')),
        event_2_room: get('Second Event Room'),
        event_3_date: getDate(getRaw('Third Event date')),
        event_3_room: get('Third Event Room'),
        event_4_date: getDate(getRaw('Fourth Event date')),
        event_4_room: get('Fourth Event Room'),
        order_instructions: get('Order Instructions (Always Double Click to see all Notes even if empty)'),
        charity: get('Charity'),
        landing_page_url: get('Landing Page URL'),
        registration_phone: get('Registration Phone Number'),
        class_type: get('Class Type'),
        qr_code_link: get('QR Code Link'),
        sending_list_folder_url: get('Order Google Folder (Sending List)'),
        selected_mailer_design: get('Selected Mailer Design'),
        mailer_return_address: get('Mailer Return Address'),
        mailing_quantity: getInt(getRaw('Mailing Quantity')),
        start_time: getTime(getRaw('Start Time')),
        end_time: getTime(getRaw('End Time')),
        time_notes: get('Start & End Time Notes (If different times)')
      }
    })
    .filter(r => r.order_number != null)
}

// ---------- 4. Parse Digital Jobs ----------
interface RawDigital {
  digital_status: string | null
  advisor_name: string | null
  group_name: string | null
  event_1_date: string | null
  event_2_date: string | null
  venue_text: string | null
  venue_address_text: string | null
  start_time: string | null
  end_time: string | null
  class_type: string | null
  qa_status: string | null
  tp_status: string | null
  sheet_needed: string | null
  landing_page_url: string | null
  digital_budget: number | null
  notes: string | null
  privacy_company_name: string | null
  privacy_company_website: string | null
  disclaimer: string | null
  ethnicity_avoid: string | null
  order_number: number | null
}

function parseDigital(): RawDigital[] {
  const { header, rows } = parseTable(readMd('digital-jobs.md'))
  return rows.map(r => {
    const get = (h: string): string | null => {
      const i = header.indexOf(h)
      return i < 0 ? null : unesc(blank(r[i]))
    }
    const getRaw = (h: string): string | null => {
      const i = header.indexOf(h)
      return i < 0 ? null : r[i]
    }
    return {
      digital_status: get('Status'),
      advisor_name: get('Advisor Name'),
      group_name: get('Group Name'),
      event_1_date: getDate(getRaw('First Event date')),
      event_2_date: getDate(getRaw('Second Event Date')),
      venue_text: get('Location Name & Room'),
      venue_address_text: get('Location Address'),
      start_time: getTime(getRaw('Start Time')),
      end_time: getTime(getRaw('End Time')),
      class_type: get('Class Type'),
      qa_status: get('QA Status'),
      tp_status: get('TP Status'),
      sheet_needed: get('Sheet Needed'),
      landing_page_url: get('Landing Page URL'),
      digital_budget: getMoney(getRaw('Max Budget')),
      notes: get('Notes'),
      privacy_company_name: get('Privacy Company Name'),
      privacy_company_website: get('Privacy Company Website'),
      disclaimer: get('Disclaimer'),
      ethnicity_avoid: get('Ethnicity in the Area to Avoid (or not)'),
      order_number: getInt(getRaw('Order Number'))
    }
  })
}

// ---------- 5. Parse Invoice Sheet ----------
interface RawInvoice {
  status: string | null
  order_number: number | null
  advisor_name: string | null
  group_name: string | null
  invoice_sent_date: string | null
  invoice_paid_date: string | null
  first_class_day: string | null
  invoiced_dm_rate: number | null
  mailing_quantity: number | null
  direct_mail_discount: string | null
  invoiced_dm_total: number | null
  invoiced_digital: number | null
  invoiced_tech: number | null
  cc_processing: number | null
  fl_state_tax: number | null
  total_invoice: number | null
  invoiced_flag: string | null
  mailer_type: string | null
  venue_text: string | null
  venue_address_text: string | null
}

function parseInvoices(): RawInvoice[] {
  const { header, rows } = parseTable(readMd('invoice.md'))
  return rows
    .map(r => {
      const get = (h: string): string | null => {
        const i = header.indexOf(h)
        return i < 0 ? null : unesc(blank(r[i]))
      }
      const getRaw = (h: string): string | null => {
        const i = header.indexOf(h)
        return i < 0 ? null : r[i]
      }
      return {
        status: get('Status'),
        order_number: getInt(getRaw('Order Number')),
        advisor_name: get('Advisor Name'),
        group_name: get('Group Name'),
        invoice_sent_date: getDate(getRaw('Invoice Sent Date')),
        invoice_paid_date: getDate(getRaw('Invoice Paid Date')),
        first_class_day: getDate(getRaw('First Class Day')),
        invoiced_dm_rate: getMoney(getRaw('Invoiced Direct Rate (per)')),
        mailing_quantity: getInt(getRaw('Mailing Quantity')),
        direct_mail_discount: get('Direct Mail Discounts'),
        invoiced_dm_total: getMoney(getRaw('Invoiced Direct Mail')),
        invoiced_digital: getMoney(getRaw('Invoiced Digital')),
        invoiced_tech: getMoney(getRaw('Invoiced Tech/Sequences')),
        cc_processing: getMoney(getRaw('CC Processing')),
        fl_state_tax: getMoney(getRaw('FL State Tax')),
        total_invoice: getMoney(getRaw('Total Invoice')),
        invoiced_flag: get('Invoiced'),
        mailer_type: get('Mailer Type'),
        venue_text: get('Venue Name & Room'),
        venue_address_text: get('Venue Address')
      }
    })
    .filter(r => r.order_number != null)
}

// ---------- 6. Parse Creative Dictionary ----------
interface RawCreative {
  status: string | null
  advisor: string | null
  venue: string | null
  notes: string | null
  topic_assets: string | null
  applicable_class_types: string[]
}

function parseCreative(): RawCreative[] {
  const md = readMd('creative-dict.md')
  // Two tables separated by blank line; take only the first
  const blocks: string[] = []
  let current: string[] = []
  for (const line of md.split('\n')) {
    if (line.startsWith('|')) {
      current.push(line)
    } else if (current.length) {
      blocks.push(current.join('\n'))
      current = []
    }
  }
  if (current.length) blocks.push(current.join('\n'))
  if (!blocks.length) return []
  const { header, rows } = parseTable(blocks[0])

  return rows
    .map(r => {
      const get = (h: string): string | null => {
        const i = header.indexOf(h)
        return i < 0 ? null : unesc(blank(r[i]))
      }
      const topic = get('Topic Assets Availability')
      const types = new Set<string>()
      if (topic) {
        // The topic-assets cell sometimes contains the topics directly: "R101", "R101 SS101", etc
        topic.split(/[\s,•]+/).forEach(t => {
          const ts = t.trim()
          if (ts && /^[A-Za-z0-9 ]{2,8}$/.test(ts)) types.add(ts)
        })
      }
      // Also walk every column whose header looks like "TYPE/..." and if the cell is TRUE add that TYPE
      const classCols: [string, RegExp][] = [
        ['R101', /^R101/],
        ['W101', /^W101/],
        ['SS101', /^SS/],
        ['WAT', /^WAT/],
        ['Taxes', /^Taxes/],
        ['Job Loss', /^Job Loss/],
        ['Wealth 101', /^Wealth 101/]
      ]
      for (let i = 0; i < header.length; i++) {
        const h = header[i]
        for (const [type, re] of classCols) {
          if (re.test(h)) {
            const v = unesc(blank(r[i]))
            if (v === 'TRUE') types.add(type)
            break
          }
        }
      }
      return {
        status: get('Status / Notes'),
        advisor: get('Advisor'),
        venue: get('Venue'),
        notes: unesc(blank(r[3])),
        topic_assets: topic,
        applicable_class_types: [...types]
      }
    })
    .filter(r => r.venue)
}

// ---------- main ----------
async function main() {
  console.log('Parsing markdown sheets...')
  const dictRows = parseClientDict()
  const mainOrders = parseMainOrders()
  const dmRows = parseDirectMail()
  const digitalRows = parseDigital()
  const invoiceRows = parseInvoices()
  const creativeRows = parseCreative()

  console.log(`  client dict: ${dictRows.length}`)
  console.log(`  main orders: ${mainOrders.length}`)
  console.log(`  direct mail: ${dmRows.length}`)
  console.log(`  digital:     ${digitalRows.length}`)
  console.log(`  invoices:    ${invoiceRows.length}`)
  console.log(`  creative:    ${creativeRows.length}`)

  // ---------- BUILD CLIENTS ----------
  // Step 1: bucket dictionary rows by canonical client name.
  const clientBuckets = new Map<string, RawClientRow[]>()
  for (const row of dictRows) {
    const bucket = classifyClient(row.fmo, row.advisor_name)
    const arr = clientBuckets.get(bucket.name) ?? []
    arr.push(row)
    clientBuckets.set(bucket.name, arr)
  }

  // Step 2: ensure every group-name referenced by orders has a bucket, even
  // if no dict row contained it (e.g. some FTA office variants only in order sheets).
  for (const ord of [...mainOrders, ...dmRows, ...invoiceRows]) {
    if (!ord.group_name && !ord.advisor_name) continue
    const bucket = classifyClient(ord.group_name, ord.advisor_name)
    if (!clientBuckets.has(bucket.name)) {
      clientBuckets.set(bucket.name, [])
    }
  }

  console.log(`\nDistinct clients to create: ${clientBuckets.size}`)

  // Step 3: build clients[] rows
  type ClientInsert = {
    name: string
    is_group: boolean
    business_name?: string | null
    business_website?: string | null
    ein?: string | null
    ein_match_name?: string | null
    disclaimer?: string | null
    description?: string | null
    notes?: string | null
    default_mailer_rate?: number | null
    default_mailing_quantity?: number | null
    default_digital_budget?: number | null
    default_mailer_type?: string | null
    default_class_type?: string | null
    tech_sequences?: string | null
    direct_mail_discount?: string | null
    start_before_paid?: boolean | null
    responsibility?: string | null
    is_non_profit?: boolean | null
  }

  // Pick the "best" representative dict row for non-null fields
  const pickFirst = (rows: RawClientRow[], key: keyof RawClientRow): any => {
    for (const r of rows) {
      const v = (r as any)[key]
      if (v != null && v !== '') return v
    }
    return null
  }

  const clientInserts: ClientInsert[] = []
  for (const [name, rows] of clientBuckets.entries()) {
    const isGroup = GROUP_CLIENT_NAMES.has(name)
    clientInserts.push({
      name,
      is_group: isGroup,
      business_name: pickFirst(rows, 'business_name'),
      business_website: pickFirst(rows, 'business_website'),
      ein: pickFirst(rows, 'ein'),
      ein_match_name: pickFirst(rows, 'ein_match_name'),
      disclaimer: pickFirst(rows, 'disclaimer'),
      description: pickFirst(rows, 'description'),
      notes: pickFirst(rows, 'notes'),
      default_mailer_rate: pickFirst(rows, 'default_mailer_rate'),
      default_mailing_quantity: pickFirst(rows, 'default_mailing_quantity'),
      default_digital_budget: pickFirst(rows, 'default_digital_budget'),
      default_mailer_type: pickFirst(rows, 'mailer_type'),
      default_class_type: null,
      tech_sequences: pickFirst(rows, 'tech_sequences'),
      direct_mail_discount: pickFirst(rows, 'direct_mail_discount'),
      start_before_paid: pickFirst(rows, 'start_before_paid'),
      responsibility: pickFirst(rows, 'responsibility'),
      is_non_profit: rows.some(r => r.is_non_profit)
    })
  }

  console.log(`\nInserting ${clientInserts.length} clients...`)
  const { data: insertedClients, error: clientErr } = await supabase
    .from('clients')
    .insert(clientInserts)
    .select('id, name')
  if (clientErr) throw clientErr
  if (!insertedClients) throw new Error('No clients inserted')

  // Map: name -> id
  const clientIdByName = new Map<string, string>()
  for (const c of insertedClients) clientIdByName.set(c.name, c.id)
  const ftaClientId = clientIdByName.get('FTA')
  console.log(`  inserted ${insertedClients.length} clients (FTA = ${ftaClientId})`)

  // ---------- BUILD OFFICES ----------
  type OfficeInsert = {
    client_id: string
    name: string
    advisor_names?: string[] | null
    business_address?: any
    mailer_return_address?: any
    registration_phone?: string | null
    registration_url_direct?: string | null
    registration_url_digital?: string | null
    main_contact?: any
    secondary_contact?: any
    cc_emails?: string[] | null
    is_primary?: boolean
    notes?: string | null
  }

  function buildBusinessAddress(r: RawClientRow): any | null {
    if (!r.business_address && !r.business_city && !r.business_state) return null
    return {
      street: r.business_address,
      city: r.business_city,
      state: r.business_state
    }
  }

  function buildContact(name: string | null, email: string | null, phone: string | null, pos: string | null): any | null {
    if (!name && !email && !phone && !pos) return null
    return { name, email, phone, position: pos }
  }

  function splitCc(s: string | null): string[] | null {
    if (!s) return null
    const parts = s.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean)
    return parts.length ? parts : null
  }

  function buildOfficeName(row: RawClientRow, clientName: string): string {
    // For FTA: advisor_name field is actually office name (St. Louis, Dallas, etc.)
    if (clientName === 'FTA') {
      // Special-case FTA STL SS = "St. Louis SS"
      if (row.advisor_name === 'FTA STL SS') return 'St. Louis SS'
      return row.advisor_name || 'Main'
    }
    // For other groups, the advisor name is the office label
    if (GROUP_CLIENT_NAMES.has(clientName)) {
      // For Arrive: "Brad Evans" -> "Brad Evans" (already the office label)
      return row.advisor_name || 'Main'
    }
    // For independent firms, only one office expected
    return row.advisor_name || 'Main'
  }

  const officeInserts: OfficeInsert[] = []
  // Track an office key (clientName + officeName) -> array index so we can rehydrate IDs later
  const officeKeyToIndex = new Map<string, number>()
  // Also keep a map from advisor name -> clientName/officeName for order matching
  const advisorToOffice = new Map<string, { clientName: string; officeName: string }>()

  for (const [clientName, rows] of clientBuckets.entries()) {
    const clientId = clientIdByName.get(clientName)
    if (!clientId) {
      logUnmapped({ kind: 'missing-client-id', clientName })
      continue
    }

    if (rows.length === 0) {
      // Phantom client referenced only by orders — create a Main office
      const off: OfficeInsert = { client_id: clientId, name: 'Main', is_primary: true }
      officeKeyToIndex.set(`${clientName}::Main`, officeInserts.length)
      officeInserts.push(off)
      continue
    }

    if (clientName === 'FTA') {
      // For FTA the advisor_name column is actually the office label.
      // Section 1 has St. Louis, FTA STL SS, Southern Illinois, Rolling Meadows, Oak Brook, Dallas
      // Group rows by (logical office), aggregate advisor list from the "Advisors" column.
      const officeGroups = new Map<string, RawClientRow[]>()
      for (const r of rows) {
        const officeName = buildOfficeName(r, 'FTA')
        const arr = officeGroups.get(officeName) ?? []
        arr.push(r)
        officeGroups.set(officeName, arr)
      }
      let isFirst = true
      for (const [officeName, oRows] of officeGroups.entries()) {
        const advisors = new Set<string>()
        for (const r of oRows) {
          if (r.advisors_list) {
            for (const a of r.advisors_list.split(/[,;]+/).map(x => x.trim()).filter(Boolean)) {
              advisors.add(a)
            }
          }
        }
        const off: OfficeInsert = {
          client_id: clientId,
          name: officeName,
          advisor_names: advisors.size ? [...advisors] : null,
          business_address: buildBusinessAddress(oRows[0]),
          mailer_return_address: oRows[0].mailer_return_address
            ? { freeform: oRows[0].mailer_return_address }
            : null,
          registration_phone: pickFirst(oRows, 'registration_phone'),
          registration_url_direct: pickFirst(oRows, 'registration_url_direct'),
          registration_url_digital: pickFirst(oRows, 'registration_url_digital'),
          main_contact: buildContact(
            pickFirst(oRows, 'main_contact_name'),
            pickFirst(oRows, 'main_contact_email'),
            pickFirst(oRows, 'main_contact_phone'),
            pickFirst(oRows, 'main_contact_position')
          ),
          secondary_contact: buildContact(
            pickFirst(oRows, 'secondary_contact_name'),
            pickFirst(oRows, 'secondary_contact_email'),
            pickFirst(oRows, 'secondary_contact_phone'),
            pickFirst(oRows, 'secondary_contact_position')
          ),
          cc_emails: splitCc(pickFirst(oRows, 'cc_emails')),
          is_primary: isFirst,
          notes: pickFirst(oRows, 'notes')
        }
        isFirst = false
        officeKeyToIndex.set(`${clientName}::${officeName}`, officeInserts.length)
        officeInserts.push(off)
        // Track advisor-to-office for order matching
        for (const a of advisors) {
          if (!advisorToOffice.has(a)) advisorToOffice.set(a, { clientName, officeName })
        }
      }
    } else {
      // For non-FTA groups & independent firms:
      //   Each dict row -> one office (advisor name = office label).
      let isFirst = true
      for (const r of rows) {
        const officeName = buildOfficeName(r, clientName)
        const advisors = new Set<string>()
        if (r.advisor_name) advisors.add(r.advisor_name)
        if (r.advisors_list) {
          for (const a of r.advisors_list.split(/[,;]+/).map(x => x.trim()).filter(Boolean)) {
            advisors.add(a)
          }
        }
        const off: OfficeInsert = {
          client_id: clientId,
          name: officeName,
          advisor_names: advisors.size ? [...advisors] : null,
          business_address: buildBusinessAddress(r),
          mailer_return_address: r.mailer_return_address
            ? { freeform: r.mailer_return_address }
            : null,
          registration_phone: r.registration_phone,
          registration_url_direct: r.registration_url_direct,
          registration_url_digital: r.registration_url_digital,
          main_contact: buildContact(
            r.main_contact_name,
            r.main_contact_email,
            r.main_contact_phone,
            r.main_contact_position
          ),
          secondary_contact: buildContact(
            r.secondary_contact_name,
            r.secondary_contact_email,
            r.secondary_contact_phone,
            r.secondary_contact_position
          ),
          cc_emails: splitCc(r.cc_emails),
          is_primary: isFirst,
          notes: r.notes
        }
        isFirst = false
        // If duplicate office name within the same client, skip (deduplicate)
        const key = `${clientName}::${officeName}`
        if (officeKeyToIndex.has(key)) continue
        officeKeyToIndex.set(key, officeInserts.length)
        officeInserts.push(off)
        for (const a of advisors) {
          if (!advisorToOffice.has(a)) advisorToOffice.set(a, { clientName, officeName })
        }
      }
    }
  }

  console.log(`Inserting ${officeInserts.length} offices...`)
  const { data: insertedOffices, error: officeErr } = await supabase
    .from('offices')
    .insert(officeInserts)
    .select('id, client_id, name')
  if (officeErr) throw officeErr
  if (!insertedOffices) throw new Error('No offices inserted')
  console.log(`  inserted ${insertedOffices.length} offices`)

  // Map "clientName::officeName" -> office id
  const officeIdByKey = new Map<string, string>()
  const clientNameById = new Map<string, string>()
  for (const c of insertedClients) clientNameById.set(c.id, c.name)
  for (const o of insertedOffices) {
    const clientName = clientNameById.get(o.client_id)!
    officeIdByKey.set(`${clientName}::${o.name}`, o.id)
  }

  // ---------- BUILD VENUES ----------
  // Collect every distinct (clientName, venueName) from orders + creative dict.
  type VenueInsert = {
    client_id: string
    name: string
    address?: any
    notes?: string | null
    asset_availability?: string | null
    applicable_class_types?: string[] | null
  }

  function normalizeVenueName(name: string | null): string | null {
    if (!name) return null
    return unesc(name)?.replace(/\s+•\s+Room:.*$/i, '').trim() ?? null
  }

  // Find creative metadata by approximate venue match
  function findCreative(venueName: string): RawCreative | null {
    const target = venueName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    for (const c of creativeRows) {
      if (!c.venue) continue
      const cn = c.venue.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      if (cn.startsWith(target) || target.startsWith(cn) || cn.includes(target) || target.includes(cn)) {
        return c
      }
    }
    return null
  }

  // Each (clientId, venueName) -> venue insert + supplementary metadata
  const venueMap = new Map<string, VenueInsert>()
  const allOrderSources: { order: { group_name: string | null; advisor_name: string | null; venue_text: string | null; venue_address_text: string | null } }[] = []
  for (const r of mainOrders) {
    allOrderSources.push({ order: r })
  }
  for (const r of dmRows) {
    allOrderSources.push({ order: r })
  }
  for (const r of invoiceRows) {
    allOrderSources.push({ order: r })
  }

  for (const { order } of allOrderSources) {
    if (!order.venue_text) continue
    const bucket = classifyClient(order.group_name, order.advisor_name)
    const clientId = clientIdByName.get(bucket.name)
    if (!clientId) continue
    const vName = normalizeVenueName(order.venue_text)!
    if (!vName) continue
    const key = `${clientId}::${vName}`
    if (venueMap.has(key)) continue
    const creative = findCreative(vName)
    venueMap.set(key, {
      client_id: clientId,
      name: vName,
      address: order.venue_address_text ? { freeform: order.venue_address_text } : null,
      notes: creative?.notes ?? null,
      asset_availability: creative?.topic_assets ?? null,
      applicable_class_types:
        creative?.applicable_class_types && creative.applicable_class_types.length
          ? creative.applicable_class_types
          : null
    })
  }

  // Also pull venues from the creative dict alone (some venues that don't appear in orders)
  for (const c of creativeRows) {
    if (!c.advisor || !c.venue) continue
    // Look up the office/client for this advisor
    const mapping = advisorToOffice.get(c.advisor)
    if (!mapping) continue
    const clientId = clientIdByName.get(mapping.clientName)
    if (!clientId) continue
    const vName = normalizeVenueName(c.venue)
    if (!vName) continue
    const key = `${clientId}::${vName}`
    if (venueMap.has(key)) continue
    venueMap.set(key, {
      client_id: clientId,
      name: vName,
      address: null,
      notes: c.notes,
      asset_availability: c.topic_assets,
      applicable_class_types: c.applicable_class_types?.length ? c.applicable_class_types : null
    })
  }

  const venueInserts = [...venueMap.values()]
  console.log(`\nInserting ${venueInserts.length} venues...`)
  // Insert in batches of 500 to be safe
  let insertedVenues: { id: string; client_id: string; name: string }[] = []
  for (let i = 0; i < venueInserts.length; i += 500) {
    const batch = venueInserts.slice(i, i + 500)
    const { data, error } = await supabase
      .from('venues')
      .insert(batch)
      .select('id, client_id, name')
    if (error) throw error
    if (data) insertedVenues = insertedVenues.concat(data)
  }
  console.log(`  inserted ${insertedVenues.length} venues`)

  const venueIdByKey = new Map<string, string>()
  for (const v of insertedVenues) {
    venueIdByKey.set(`${v.client_id}::${v.name}`, v.id)
  }

  // ---------- BUILD ORDERS ----------
  // Merge sources by order_number
  // Priority: main_orders > direct_mail > invoice > digital
  type OrderInsert = {
    order_number: number
    client_id: string
    office_id?: string | null
    advisor_name?: string | null
    needs_direct_mail?: boolean | null
    needs_digital?: boolean | null
    needs_google_sheet?: boolean | null
    class_type?: string | null
    market?: string | null
    charity?: string | null
    venue_id?: string | null
    venue_text?: string | null
    venue_address_text?: string | null
    event_1_date?: string | null
    event_1_room?: string | null
    event_2_date?: string | null
    event_2_room?: string | null
    event_3_date?: string | null
    event_3_room?: string | null
    event_4_date?: string | null
    event_4_room?: string | null
    start_time?: string | null
    end_time?: string | null
    time_notes?: string | null
    mailing_quantity?: number | null
    mailer_type?: string | null
    mailer_return_address_override?: any
    qr_code_link?: string | null
    selected_mailer_design?: string | null
    sending_list_folder_url?: string | null
    client_approval_deadline?: string | null
    order_sent_deadline?: string | null
    first_class_day?: string | null
    teledirect_added?: string | null
    digital_budget?: number | null
    landing_page_url_direct?: string | null
    landing_page_url_digital?: string | null
    privacy_company_name?: string | null
    privacy_company_website?: string | null
    digital_disclaimer?: string | null
    ethnicity_avoid?: string | null
    qa_status?: string | null
    tp_status?: string | null
    sheet_needed?: string | null
    dm_status?: string | null
    digital_status?: string | null
    invoice_status?: string | null
    main_status?: string | null
    order_instructions?: string | null
    notes?: string | null
  }

  // Index supplementary sheets by order_number
  const dmByNum = new Map<number, RawDM>()
  for (const r of dmRows) if (r.order_number) dmByNum.set(r.order_number, r)
  const invByNum = new Map<number, RawInvoice>()
  for (const r of invoiceRows) if (r.order_number) invByNum.set(r.order_number, r)
  const digByNum = new Map<number, RawDigital>()
  for (const r of digitalRows) if (r.order_number) digByNum.set(r.order_number, r)

  // Collect every unique order number
  const allOrderNums = new Set<number>()
  for (const r of mainOrders) if (r.order_number) allOrderNums.add(r.order_number)
  for (const n of dmByNum.keys()) allOrderNums.add(n)
  for (const n of invByNum.keys()) allOrderNums.add(n)
  for (const n of digByNum.keys()) allOrderNums.add(n)

  console.log(`\nMerging orders. Distinct order_numbers across all sheets: ${allOrderNums.size}`)

  const mainByNum = new Map<number, RawMainOrder>()
  for (const r of mainOrders) if (r.order_number) mainByNum.set(r.order_number, r)

  // Build a single per-number record using main as the spine (or DM/Invoice if missing)
  const orderInserts: OrderInsert[] = []
  const skipped: { order_number: number; reason: string }[] = []

  for (const num of [...allOrderNums].sort((a, b) => a - b)) {
    const main = mainByNum.get(num)
    const dm = dmByNum.get(num)
    const inv = invByNum.get(num)
    const dig = digByNum.get(num)

    // Best advisor + group_name available
    const advisorName = main?.advisor_name || dm?.advisor_name || inv?.advisor_name || dig?.advisor_name
    const groupName = main?.group_name || dm?.group_name || inv?.group_name || dig?.group_name

    const bucket = classifyClient(groupName, advisorName)
    const clientId = clientIdByName.get(bucket.name)
    if (!clientId) {
      skipped.push({ order_number: num, reason: `Could not resolve client for group="${groupName}" advisor="${advisorName}"` })
      logUnmapped({ kind: 'unmapped-order', order_number: num, group: groupName, advisor: advisorName })
      continue
    }

    // Determine office for this order:
    //   1. Try by advisor name lookup
    //   2. Else try group/office hints (e.g. "FTA Chicago", "FTA St. Louis", "Arrive Financial Services AZ")
    let officeId: string | null = null
    if (advisorName && advisorToOffice.has(advisorName)) {
      const mapping = advisorToOffice.get(advisorName)!
      if (mapping.clientName === bucket.name) {
        officeId = officeIdByKey.get(`${bucket.name}::${mapping.officeName}`) ?? null
      }
    }
    if (!officeId) {
      // FTA: heuristic for "FTA Chicago", "FTA St. Louis", "FTA TX", "FTA STL"
      if (bucket.name === 'FTA') {
        const adv = (advisorName || '').toLowerCase()
        if (adv.includes('chicago') || adv === 'chicago') {
          // FTA "Chicago" could be either Rolling Meadows or Oak Brook. Use Oak Brook as default.
          officeId = officeIdByKey.get('FTA::Oak Brook') ?? null
        } else if (adv.includes('st. louis') || adv === 'fta stl' || adv === 'fta st. louis') {
          officeId = officeIdByKey.get('FTA::St. Louis') ?? null
        } else if (adv.includes('tx') || adv.includes('dallas')) {
          officeId = officeIdByKey.get('FTA::Dallas') ?? null
        } else if (adv.includes('rolling meadows')) {
          officeId = officeIdByKey.get('FTA::Rolling Meadows') ?? null
        } else if (adv.includes('oak brook')) {
          officeId = officeIdByKey.get('FTA::Oak Brook') ?? null
        } else if (adv.includes('southern illinois')) {
          officeId = officeIdByKey.get('FTA::Southern Illinois') ?? null
        }
      }
      if (bucket.name === 'Arrive Financial Services') {
        const grpL = (groupName || '').toLowerCase()
        if (grpL.includes('az')) {
          // Try JoAnn Roach (AZ) office
          officeId = officeIdByKey.get('Arrive Financial Services::JoAnn Roach') ?? null
        } else if (grpL.includes('co')) {
          officeId = officeIdByKey.get('Arrive Financial Services::Kim Edwards') ?? null
        } else if (grpL.includes('nc')) {
          officeId = officeIdByKey.get('Arrive Financial Services::Whitney Ross') ?? null
        } else if (grpL.includes('ca')) {
          officeId = officeIdByKey.get('Arrive Financial Services::Eladio Montelongo') ?? null
        }
      }
      if (bucket.name === 'Sentinel/SAM RIA') {
        const adv = (advisorName || '').toLowerCase()
        const grpL = (groupName || '').toLowerCase()
        if (adv === 'william warner' || adv === 'will warner') {
          // Default to CT
          officeId = officeIdByKey.get('Sentinel/SAM RIA::Will Warner - CT') ?? null
        }
        if (!officeId && grpL.includes('ct')) {
          officeId = officeIdByKey.get('Sentinel/SAM RIA::Will Warner - CT') ?? null
        }
        if (!officeId && grpL.includes('md')) {
          officeId = officeIdByKey.get('Sentinel/SAM RIA::Will Warner - MD') ?? null
        }
        if (!officeId && grpL.includes('pa')) {
          officeId = officeIdByKey.get('Sentinel/SAM RIA::Will Warner - PA') ?? null
        }
      }
    }
    if (!officeId) {
      // Fallback: first office on this client
      const candidate = [...officeIdByKey.entries()].find(([k]) => k.startsWith(`${bucket.name}::`))
      if (candidate) officeId = candidate[1]
    }

    // Determine venue id
    const venueText = main?.venue_text || dm?.venue_text || inv?.venue_text
    const venueAddr = main?.venue_address_text || dm?.venue_address_text || inv?.venue_address_text
    let venueId: string | null = null
    if (venueText) {
      const norm = normalizeVenueName(venueText)
      if (norm) venueId = venueIdByKey.get(`${clientId}::${norm}`) ?? null
    }

    // Resolve class type — prefer main, else DM, else digital
    const classType = main?.class_type || dm?.class_type || dig?.class_type

    const order: OrderInsert = {
      order_number: num,
      client_id: clientId,
      office_id: officeId,
      advisor_name: advisorName ?? null,
      needs_direct_mail: main?.needs_direct_mail ?? null,
      needs_digital: main?.needs_digital ?? null,
      needs_google_sheet: main?.needs_google_sheet ?? null,
      class_type: classType ?? null,
      market: main?.market ?? null,
      charity: main?.charity ?? dm?.charity ?? null,
      venue_id: venueId,
      venue_text: venueText ?? null,
      venue_address_text: venueAddr ?? null,
      event_1_date: main?.event_1_date ?? dm?.event_1_date ?? dig?.event_1_date ?? null,
      event_1_room: main?.event_1_room ?? dm?.event_1_room ?? null,
      event_2_date: main?.event_2_date ?? dm?.event_2_date ?? dig?.event_2_date ?? null,
      event_2_room: main?.event_2_room ?? dm?.event_2_room ?? null,
      event_3_date: main?.event_3_date ?? dm?.event_3_date ?? null,
      event_3_room: main?.event_3_room ?? dm?.event_3_room ?? null,
      event_4_date: main?.event_4_date ?? dm?.event_4_date ?? null,
      event_4_room: main?.event_4_room ?? dm?.event_4_room ?? null,
      start_time: main?.start_time ?? dm?.start_time ?? dig?.start_time ?? null,
      end_time: main?.end_time ?? dm?.end_time ?? dig?.end_time ?? null,
      time_notes: main?.time_notes ?? dm?.time_notes ?? null,
      mailing_quantity: main?.mailing_quantity ?? dm?.mailing_quantity ?? inv?.mailing_quantity ?? null,
      mailer_type: main?.mailer_type ?? inv?.mailer_type ?? null,
      mailer_return_address_override: main?.mailer_return_address
        ? { freeform: main.mailer_return_address }
        : (dm?.mailer_return_address ? { freeform: dm.mailer_return_address } : null),
      qr_code_link: dm?.qr_code_link ?? null,
      selected_mailer_design: dm?.selected_mailer_design ?? null,
      sending_list_folder_url: dm?.sending_list_folder_url ?? null,
      client_approval_deadline: dm?.client_approval_deadline ?? null,
      order_sent_deadline: dm?.order_sent_deadline ?? null,
      first_class_day: dm?.first_class_day ?? inv?.first_class_day ?? null,
      teledirect_added: dm?.teledirect_added ?? null,
      digital_budget: main?.digital_budget ?? dig?.digital_budget ?? null,
      landing_page_url_direct: main?.landing_page_url_direct ?? dm?.landing_page_url ?? null,
      landing_page_url_digital: main?.landing_page_url_digital ?? dig?.landing_page_url ?? null,
      privacy_company_name: dig?.privacy_company_name ?? null,
      privacy_company_website: dig?.privacy_company_website ?? null,
      digital_disclaimer: dig?.disclaimer ?? null,
      ethnicity_avoid: dig?.ethnicity_avoid ?? null,
      qa_status: dig?.qa_status ?? null,
      tp_status: dig?.tp_status ?? null,
      sheet_needed: dig?.sheet_needed ?? null,
      dm_status: dm?.dm_status ?? null,
      digital_status: dig?.digital_status ?? null,
      invoice_status: inv?.status ?? null,
      main_status: main?.main_status ?? null,
      order_instructions: dm?.order_instructions ?? null,
      notes: dig?.notes ?? null
    }

    orderInserts.push(order)
  }

  console.log(`\nInserting ${orderInserts.length} orders (${skipped.length} skipped)...`)
  let insertedOrders: { id: string; order_number: number }[] = []
  for (let i = 0; i < orderInserts.length; i += 200) {
    const batch = orderInserts.slice(i, i + 200)
    const { data, error } = await supabase
      .from('orders')
      .insert(batch)
      .select('id, order_number')
    if (error) throw error
    if (data) insertedOrders = insertedOrders.concat(data)
  }
  console.log(`  inserted ${insertedOrders.length} orders`)

  // ---------- BUILD INVOICES ----------
  const orderIdByNum = new Map<number, string>()
  for (const o of insertedOrders) orderIdByNum.set(o.order_number, o.id)

  type InvoiceInsert = {
    order_id: string
    status: string
    invoice_sent_date?: string | null
    invoice_paid_date?: string | null
    invoiced_dm_rate?: number | null
    invoiced_dm_total?: number | null
    invoiced_digital?: number | null
    invoiced_tech?: number | null
    cc_processing?: number | null
    fl_state_tax?: number | null
    total_invoice?: number | null
  }

  const invoiceInserts: InvoiceInsert[] = []
  for (const r of invoiceRows) {
    if (!r.order_number) continue
    const orderId = orderIdByNum.get(r.order_number)
    if (!orderId) {
      logUnmapped({ kind: 'unmapped-invoice', order_number: r.order_number })
      continue
    }
    invoiceInserts.push({
      order_id: orderId,
      status: r.status || 'Not Started',
      invoice_sent_date: r.invoice_sent_date,
      invoice_paid_date: r.invoice_paid_date,
      invoiced_dm_rate: r.invoiced_dm_rate,
      invoiced_dm_total: r.invoiced_dm_total,
      invoiced_digital: r.invoiced_digital,
      invoiced_tech: r.invoiced_tech,
      cc_processing: r.cc_processing,
      fl_state_tax: r.fl_state_tax,
      total_invoice: r.total_invoice
    })
  }

  console.log(`\nInserting ${invoiceInserts.length} invoices...`)
  let insertedInvoices: { id: string }[] = []
  for (let i = 0; i < invoiceInserts.length; i += 200) {
    const batch = invoiceInserts.slice(i, i + 200)
    const { data, error } = await supabase
      .from('invoices')
      .insert(batch)
      .select('id')
    if (error) throw error
    if (data) insertedInvoices = insertedInvoices.concat(data)
  }
  console.log(`  inserted ${insertedInvoices.length} invoices`)

  // ---------- ORDER EVENTS ----------
  const orderEventsInserts = insertedOrders.map(o => ({
    order_id: o.id,
    event: 'Imported from sheets',
    payload: { source: 'main-order-sheet' }
  }))

  console.log(`\nInserting ${orderEventsInserts.length} order_events...`)
  for (let i = 0; i < orderEventsInserts.length; i += 200) {
    const batch = orderEventsInserts.slice(i, i + 200)
    const { error } = await supabase.from('order_events').insert(batch)
    if (error) throw error
  }
  console.log(`  inserted ${orderEventsInserts.length} order_events`)

  // ---------- DONE ----------
  console.log('\n--- IMPORT COMPLETE ---')
  console.log(`clients:   ${insertedClients.length}`)
  console.log(`offices:   ${insertedOffices.length}`)
  console.log(`venues:    ${insertedVenues.length}`)
  console.log(`orders:    ${insertedOrders.length}`)
  console.log(`invoices:  ${insertedInvoices.length}`)
  console.log(`order_events: ${orderEventsInserts.length}`)
  console.log(`\nFTA client uuid: ${ftaClientId}`)
  console.log(`Skipped orders (unmapped to client): ${skipped.length}`)
  if (skipped.length) {
    for (const s of skipped) console.log(`  - ${s.order_number}: ${s.reason}`)
  }
  console.log(`\nUnmapped log: ${UNMAPPED_LOG}`)
}

main().catch(err => {
  console.error('Import failed:', err)
  process.exit(1)
})
