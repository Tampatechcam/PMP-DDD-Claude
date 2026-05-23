/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * import-v2.ts
 *
 * Wipe + re-import PMP orders using ONLY two sources:
 *   1. Official Direct Mail Sheet CSV at scripts/.import-work/direct-mail.csv
 *      (RFC-4180-compatible CSV with multi-line quoted cells)
 *   2. Digital Jobs sheet markdown at scripts/.import-work/digital-jobs.md
 *
 * Ignores the Main Order Sheet entirely. DM Sheet "Status" -> dm_status raw.
 * Digital Jobs "Status" -> digital_status raw. main_status stays NULL.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/import-v2.ts
 */

import { parse } from 'csv-parse/sync'
import { readFileSync, writeFileSync, appendFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'

// ---------- env ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MGMT_PAT =
  process.env.SUPABASE_MANAGEMENT_PAT ||
  'REDACTED_SUPABASE_PAT'
const PROJECT_REF = 'amtunktskgwvvqumrbde'
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// ---------- HTTP helpers ----------
async function mgmtSql(query: string): Promise<any[]> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MGMT_PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SQL failed (${res.status}): ${text}`)
  }
  return (await res.json()) as any[]
}

// Use PostgREST via service-role for bulk inserts (faster than SQL string concat).
async function pgInsert(
  table: string,
  rows: any[],
  returning: string[] | null = null
): Promise<any[]> {
  if (!rows.length) return []
  const headers: Record<string, string> = {
    apikey: SERVICE_KEY!,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: returning ? 'return=representation' : 'return=minimal'
  }
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`)
  if (returning) url.searchParams.set('select', returning.join(','))
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(rows)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Insert ${table} failed (${res.status}): ${text}`)
  }
  if (!returning) return []
  return (await res.json()) as any[]
}

const W = join(process.cwd(), 'scripts', '.import-work')
const UNMAPPED_LOG = join(W, 'unmapped-v2.log.jsonl')
if (existsSync(UNMAPPED_LOG)) unlinkSync(UNMAPPED_LOG)
writeFileSync(UNMAPPED_LOG, '')

function logUnmapped(payload: Record<string, unknown>): void {
  appendFileSync(UNMAPPED_LOG, JSON.stringify(payload) + '\n')
}

// ---------- value helpers ----------
function blank(v: string | null | undefined): string | null {
  if (v == null) return null
  const s = String(v).trim()
  if (
    s === '' ||
    s === '-' ||
    s === 'N/A' ||
    s === 'n/a' ||
    s === 'TBD' ||
    s === 'FALSE' ||
    s === 'TRUE'
  ) {
    // Note: keep FALSE/TRUE OUT of this blanker for booleans; we never call blank()
    // on raw boolean cells. Keeping it here for general string trims like venue text.
    if (s === 'FALSE' || s === 'TRUE') {
      // For text-status columns we want to keep these literal — but for the unspecified
      // cell-as-text use, treat them as blank only when they sneak into free-text fields.
      // Since we'll always know the column we're parsing, ignore here:
      return s
    }
    return null
  }
  return s
}

function getMoney(v: string | null | undefined): number | null {
  const s = blank(v)
  if (!s) return null
  // Skip Excel-serial garbage like "3/18/1908" which sometimes shows up where
  // Max Budget should be — only accept currency-ish strings.
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return null
  if (/^12\/30\/1899$/.test(s)) return null
  const m = s.replace(/[,$\s]/g, '').match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

function getInt(v: string | null | undefined): number | null {
  const s = blank(v)
  if (!s) return null
  const m = s.replace(/[,\s]/g, '').match(/\d+/)
  return m ? Number(m[0]) : null
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
  let v2 = s
  v2 = v2.replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*/i, '')
  // Excel epoch garbage
  if (/^12\/30\/1899$/.test(v2)) return null
  // MM/DD/YYYY or MM/DD/YY
  let m = v2.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*$/)
  if (m) {
    const mm = m[1]
    const dd = m[2]
    let yy = m[3] ?? ''
    if (!mm || !dd) return null
    if (yy.length === 2) yy = '20' + yy
    return `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  // "January 6, 2026"
  m = v2.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\s*$/)
  if (m) {
    const mon = MONTHS[m[1]!.toLowerCase()]
    if (mon) {
      const yr = m[3] || '2026'
      return `${yr}-${mon}-${m[2]!.padStart(2, '0')}`
    }
  }
  // "January 6"
  m = v2.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*$/)
  if (m) {
    const mon = MONTHS[m[1]!.toLowerCase()]
    if (mon) return `2026-${mon}-${m[2]!.padStart(2, '0')}`
  }
  return null
}

function getTime(v: string | null | undefined): string | null {
  const s = blank(v)
  if (!s) return null
  // Excel epoch garbage like "12/30/1899"
  if (/^12\/30\/1899$/.test(s)) return null
  const m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/)
  if (!m) return null
  let hh = parseInt(m[1]!, 10)
  const mm = m[2]!
  const ss = m[3] || '00'
  const ampm = (m[4] || '').toLowerCase()
  if (hh > 23) return null
  if (ampm === 'pm' && hh < 12) hh += 12
  if (ampm === 'am' && hh === 12) hh = 0
  return `${String(hh).padStart(2, '0')}:${mm}:${ss}`
}

// ---------- grouping (ADR 0004, scoped to two sources) ----------
type ClientKind = 'group' | 'firm'
interface ClientBucket {
  kind: ClientKind
  name: string
}

// Independent-firm name aliases — different sheets use different spellings.
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
  'copper partners ii dba kelly capital partners':
    'Copper Partners II DBA Kelly Capital Partners',
  'the otoole group': "The O'Toole Group",
  "the o'toole group": "The O'Toole Group",
  'eagle financial solutions': 'Eagle Financial Solutions',
  'eagle': 'Eagle Financial Solutions',
  'advanced wealth management': 'Advanced Wealth Management',
  'avinci wealth management': 'Avinci Wealth Management',
  'mason street wealth management': 'Mason Street Wealth Management',
  'mcguire insurance & retirement solutions':
    'McGuire Insurance & Retirement Solutions',
  'ferguson wealth & insurance solutions, llc.':
    'Ferguson Wealth & Insurance Solutions, LLC.',
  'ferguson wealth & insurance solutions':
    'Ferguson Wealth & Insurance Solutions, LLC.',
  'forecast estate planning': 'Forecast Estate Planning',
  'professional group, inc.': 'Professional Group, Inc.',
  'professional group inc.': 'Professional Group, Inc.',
  'michael foguth financial group llc': 'Michael Foguth Financial Group LLC',
  'foguth financial group': 'Michael Foguth Financial Group LLC',
  'fwm': 'Michael Foguth Financial Group LLC',
  'barnett financial & tax': 'Barnett Financial & Tax',
  'proper retirement, llc': 'Proper Retirement, LLC',
  'strategic asset preservation, inc.': 'Strategic Asset Preservation, Inc.',
  'strategic': 'Strategic Asset Preservation, Inc.',
  'help to retire': 'Help To Retire',
  'ideal retirement solutions llc': 'Ideal Retirement Solutions LLC',
  // Digital-only sources
  'core': 'Core',
  'goldline': 'Goldline',
  'modewealth': 'Modewealth',
  'ascend financial': 'Ascend Financial',
  'scout': 'Scout Financial Group',
  'meekos jones': 'Meekos Jones',
  'aaron campbell': 'Aaron Campbell',
  'catherine loquet': 'Catherine Loquet',
  'chris thurman': 'Chris Thurman',
  'christian baldino': 'Christian Baldino',
  'david jones': 'David Jones',
  'gary davis': 'Gary Davis',
  'malcolm giles': 'Malcolm Giles',
  'melvin young': 'Melvin Young',
  'randy knapp': 'Randy Knapp',
  'roland desharnis': 'Roland Desharnis',
  'ron mendoza': 'Ron Mendoza',
  'scarlett green': 'Scarlett Green',
  'knoxville rertirement planners': 'Knoxville Retirement Planners',
  'lawrence': 'Lawrence',
  'secure money advisors': 'Secure Money Advisors',
  'taylor essential life partners llc': 'Taylor Essential Life Partners LLC'
}

// Group_name = an advisor's actual name (e.g. "Andy Urso") that lives inside a known group.
const ADVISOR_TO_GROUP_OVERRIDE: Record<string, string> = {
  'andy urso': 'AdvisorMax'
}

function classifyClient(rawGroup: string | null, advisorName: string | null): ClientBucket {
  const g = (rawGroup || '').trim()
  const gLower = g.toLowerCase()

  // FTA aliases (covers "FTA", "FTA TX", "FTA NSV", "FTA - Nashville", office-location-as-group)
  if (
    gLower === 'fta' ||
    gLower.startsWith('fta ') ||
    gLower.startsWith('fta-') ||
    gLower.startsWith('fta nsv') ||
    gLower.includes('fta -') ||
    gLower === 'financial tax architects' ||
    gLower === 'financial tax architects, llc' ||
    gLower === 'financial & tax architects' ||
    gLower.includes('financial & tax architects') ||
    gLower.includes('financial tax architects') ||
    gLower === 'southern illinois'
  ) {
    return { kind: 'group', name: 'FTA' }
  }

  // Sentinel/SAM RIA aliases
  if (
    gLower === 'sam ria' ||
    gLower === 'sam-ria' ||
    gLower.startsWith('sam ria') ||
    gLower.startsWith('sam-ria') ||
    gLower === 'sentinel' ||
    gLower === 'sentinel/sam ria' ||
    gLower.includes('sam ria') ||
    gLower.includes('sentinel asset management')
  ) {
    return { kind: 'group', name: 'Sentinel/SAM RIA' }
  }

  // AdvisorMax aliases
  if (gLower === 'advisormax' || gLower === 'advisor max' || gLower === 'advisormax, llc') {
    return { kind: 'group', name: 'AdvisorMax' }
  }

  // Arrive Financial Services
  if (gLower.startsWith('arrive ') || gLower === 'arrive') {
    return { kind: 'group', name: 'Arrive Financial Services' }
  }

  // Advisor-as-group override (e.g. "Andy Urso" group_name -> AdvisorMax)
  if (gLower in ADVISOR_TO_GROUP_OVERRIDE) {
    return { kind: 'group', name: ADVISOR_TO_GROUP_OVERRIDE[gLower]! }
  }
  if (advisorName && advisorName.toLowerCase() in ADVISOR_TO_GROUP_OVERRIDE) {
    return { kind: 'group', name: ADVISOR_TO_GROUP_OVERRIDE[advisorName.toLowerCase()]! }
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

// FTA office-name resolver. Group=FTA, advisor_name often is "FTA STL/CHI/NSV/TX".
// office_location column carries the human label ("St. Louis", "Rolling Meadows", etc).
function ftaOfficeName(advisorName: string | null, officeLocation: string | null): string {
  const adv = (advisorName || '').trim()
  const ofcRaw = (officeLocation || '').trim()
  const ofc = ofcRaw.toLowerCase()

  // Senior Strategies: separate office regardless of office_location
  if (adv === 'FTA STL SS') return 'St. Louis SS'

  // Use office_location if present and meaningful
  if (ofcRaw) {
    if (ofc === 'st. louis' || ofc === 'st louis' || ofc === 'stl') return 'St. Louis'
    if (ofc === 'rolling meadows') return 'Rolling Meadows'
    if (ofc === 'oak brook' || ofc === 'oakbrook') return 'Oak Brook'
    if (ofc === 'southern illinois') return 'Southern Illinois'
    if (ofc === 'dallas') return 'Dallas'
    if (ofc === 'nashville') return 'Nashville'
    if (ofc === 'chi' || ofc === 'chicago') return 'Oak Brook' // default Chicago -> Oak Brook
    if (ofc === 'sc') return 'South Carolina'
    if (ofc === 'md') return 'Maryland'
    // Else, just title-case
    return ofcRaw
  }

  // Fall back to advisor
  if (adv === 'FTA STL') return 'St. Louis'
  if (adv === 'FTA CHI' || adv === 'FTA Chicago') return 'Oak Brook'
  if (adv === 'FTA TX') return 'Dallas'
  if (adv === 'FTA NSV') return 'Nashville'
  if (adv === 'David Jones') return 'South Carolina'
  if (adv === 'Justin Yoo') return 'Maryland'
  return adv || 'Main'
}

function sentinelOfficeName(advisorName: string | null, officeLocation: string | null): string {
  const adv = (advisorName || '').trim()
  const ofc = (officeLocation || '').trim()
  // William Warner has 3 state offices: CT, MD, PA
  if (adv === 'William Warner' && ofc) return `Will Warner - ${ofc}`
  if (ofc) return ofc
  return adv || 'Main'
}

function arriveOfficeName(advisorName: string | null, officeLocation: string | null): string {
  const adv = (advisorName || '').trim()
  const ofc = (officeLocation || '').trim()
  if (ofc) return ofc
  return adv || 'Main'
}

function buildOfficeName(
  bucketName: string,
  advisorName: string | null,
  officeLocation: string | null
): string {
  if (bucketName === 'FTA') return ftaOfficeName(advisorName, officeLocation)
  if (bucketName === 'Sentinel/SAM RIA') return sentinelOfficeName(advisorName, officeLocation)
  if (bucketName === 'Arrive Financial Services') return arriveOfficeName(advisorName, officeLocation)
  if (bucketName === 'AdvisorMax') return (advisorName || officeLocation || 'Main').trim()
  // Independent firm: one office; named after the advisor (or "Main" if blank)
  return (advisorName || officeLocation || 'Main').trim() || 'Main'
}

// Canonical advisor name normalization (for joining DM + Digital)
function canonAdvisor(name: string | null): string {
  if (!name) return ''
  let n = name.trim()
  // Common typos / drift between sheets
  if (n === 'Brian Quarnata') n = 'Brian Quaranta'
  if (n === 'Stout') n = 'Albert Stout'
  if (n === 'Damian Sylvia ') n = 'Damian Sylvia'
  if (n === 'Janie Kelly ') n = 'Janie Kelly'
  return n
}

// ---------- parse DM CSV ----------
interface DMRow {
  status: string | null
  order_number: number
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

function readDM(): DMRow[] {
  const raw = readFileSync(join(W, 'direct-mail.csv'), 'utf8')
  const records: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: false,
    relax_quotes: true,
    relax_column_count: true,
    trim: false
  })
  const out: DMRow[] = []
  for (const r of records) {
    const onStr = (r['Order Number'] ?? '').trim()
    if (!onStr) continue
    const orderNumber = getInt(onStr)
    if (orderNumber == null) continue
    out.push({
      status: blank(r['Status']),
      order_number: orderNumber,
      advisor_name: canonAdvisor(blank(r['Advisor Name'])),
      group_name: blank(r['Group Name']),
      office_location: blank(r['Office Location']),
      client_approval_deadline: getDate(r['Client Approval Deadline']),
      order_sent_deadline: getDate(r['Order Sent Deadline']),
      // The DM Sheet's "First Class Day" column equals "First Event date"
      // in 97% of rows — ops uses it for the seminar day, not the mail-drop
      // day. The real mail drop is captured by Order Sent Deadline.
      first_class_day: getDate(r['Order Sent Deadline']),
      teledirect_added: blank(r['Teledirect Added']),
      venue_text: blank(r['Venue Name & Room (if not different)']),
      venue_address_text: blank(r['Venue Address']),
      event_1_date: getDate(r['First Event date']),
      event_1_room: blank(r['First Event Room']),
      event_2_date: getDate(r['Second Event Date']),
      event_2_room: blank(r['Second Event Room']),
      event_3_date: getDate(r['Third Event date']),
      event_3_room: blank(r['Third Event Room']),
      event_4_date: getDate(r['Fourth Event date']),
      event_4_room: blank(r['Fourth Event Room']),
      order_instructions: blank(
        r['Order Instructions (Always Double Click to see all Notes even if empty)']
      ),
      charity: blank(r['Charity']),
      landing_page_url: blank(r['Landing Page URL']),
      registration_phone: blank(r['Registration Phone Number']),
      class_type: blank(r['Class Type']),
      qr_code_link: blank(r['QR Code Link']),
      sending_list_folder_url: blank(r['Order Google Folder (Sending List)']),
      selected_mailer_design: blank(r['Selected Mailer Design']),
      mailer_return_address: blank(r['Mailer Return Address']),
      mailing_quantity: getInt(r['Mailing Quantity']),
      start_time: getTime(r['Start Time']),
      end_time: getTime(r['End Time']),
      time_notes: blank(r['Start & End Time Notes (If different times)'])
    })
  }
  return out
}

// ---------- parse Digital MD ----------
interface DigRow {
  status: string | null
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

function readDigital(): DigRow[] {
  const md = readFileSync(join(W, 'digital-jobs.md'), 'utf8')
  const lines = md.split('\n').filter(l => l.startsWith('|'))
  if (lines.length < 2) return []
  const cells = (line: string): string[] =>
    line.split('|').slice(1, -1).map(s => s.trim())
  const header = cells(lines[0]!)
  const idx = (h: string): number => header.indexOf(h)
  const get = (c: string[], h: string): string | null => {
    const i = idx(h)
    if (i < 0) return null
    return blank(c[i])
  }
  const getRaw = (c: string[], h: string): string | null => {
    const i = idx(h)
    if (i < 0) return null
    return c[i] ?? null
  }
  const out: DigRow[] = []
  for (let li = 1; li < lines.length; li++) {
    const c = cells(lines[li]!)
    if (c.every(x => /^[-: ]+$/.test(x))) continue
    // Drop empty placeholder rows
    const adv = canonAdvisor(get(c, 'Advisor Name'))
    const grp = get(c, 'Group Name')
    if (!adv && !grp) continue
    out.push({
      status: get(c, 'Status'),
      advisor_name: adv,
      group_name: grp,
      event_1_date: getDate(getRaw(c, 'First Event date')),
      event_2_date: getDate(getRaw(c, 'Second Event Date')),
      venue_text: get(c, 'Location Name & Room'),
      venue_address_text: get(c, 'Location Address'),
      start_time: getTime(getRaw(c, 'Start Time')),
      end_time: getTime(getRaw(c, 'End Time')),
      class_type: get(c, 'Class Type'),
      qa_status: get(c, 'QA Status'),
      tp_status: get(c, 'TP Status'),
      sheet_needed: get(c, 'Sheet Needed'),
      landing_page_url: get(c, 'Landing Page URL'),
      digital_budget: getMoney(getRaw(c, 'Max Budget')),
      notes: get(c, 'Notes'),
      privacy_company_name: get(c, 'Privacy Company Name'),
      privacy_company_website: get(c, 'Privacy Company Website'),
      disclaimer: get(c, 'Disclaimer'),
      ethnicity_avoid: get(c, 'Ethnicity in the Area to Avoid (or not)'),
      order_number: getInt(getRaw(c, 'Order Number'))
    })
  }
  return out
}

// ---------- main ----------
async function main(): Promise<void> {
  console.log('=== PMP import v2 (DM Sheet + Digital Jobs only) ===\n')

  // STEP 1: WIPE
  console.log('Step 1: wiping tables...')
  await mgmtSql(`
    DELETE FROM order_events;
    DELETE FROM proofs;
    DELETE FROM invoices;
    DELETE FROM orders;
    DELETE FROM rooms;
    DELETE FROM buildings;
    DELETE FROM venues;
    DELETE FROM offices;
    DELETE FROM clients;
  `)
  console.log('  wipe done')

  // STEP 2: PARSE
  console.log('\nStep 2: parsing source files...')
  const dmRows = readDM()
  const digRows = readDigital()
  console.log(`  DM rows (with Order Number): ${dmRows.length}`)
  console.log(`  Digital rows (after dropping empty placeholders): ${digRows.length}`)

  // STEP 3: build clients + offices from union of (group, advisor, office_location)
  type OfficeKey = { clientName: string; officeName: string; advisorName: string }
  const triples: OfficeKey[] = []
  for (const r of dmRows) {
    const bucket = classifyClient(r.group_name, r.advisor_name)
    const officeName = buildOfficeName(bucket.name, r.advisor_name, r.office_location)
    triples.push({ clientName: bucket.name, officeName, advisorName: r.advisor_name || '' })
  }
  for (const r of digRows) {
    const bucket = classifyClient(r.group_name, r.advisor_name)
    const officeName = buildOfficeName(bucket.name, r.advisor_name, null)
    triples.push({ clientName: bucket.name, officeName, advisorName: r.advisor_name || '' })
  }

  // distinct clients
  const clientNameSet = new Set<string>()
  for (const t of triples) clientNameSet.add(t.clientName)
  const clientNames = [...clientNameSet]
  console.log(`\nStep 3: inserting ${clientNames.length} clients...`)

  type ClientInsert = { name: string; is_group: boolean }
  const clientRows: ClientInsert[] = clientNames.map(n => ({
    name: n,
    is_group: GROUP_CLIENT_NAMES.has(n)
  }))
  const insertedClients = (await pgInsert('clients', clientRows, [
    'id',
    'name'
  ])) as { id: string; name: string }[]
  const clientIdByName = new Map<string, string>()
  for (const c of insertedClients) clientIdByName.set(c.name, c.id)
  const ftaClientId = clientIdByName.get('FTA')
  console.log(`  inserted ${insertedClients.length} clients (FTA = ${ftaClientId})`)

  // distinct offices (clientName::officeName), aggregating advisor list
  const officeAdvisors = new Map<string, Set<string>>() // key = client::office
  for (const t of triples) {
    const key = `${t.clientName}::${t.officeName}`
    let s = officeAdvisors.get(key)
    if (!s) {
      s = new Set<string>()
      officeAdvisors.set(key, s)
    }
    if (t.advisorName) s.add(t.advisorName)
  }

  type OfficeInsert = {
    client_id: string
    name: string
    advisor_names: string[] | null
    is_primary: boolean
  }
  const officeRows: OfficeInsert[] = []
  const seenForClient = new Set<string>() // mark first office per client primary
  // Sort so we get a deterministic primary
  const officeKeys = [...officeAdvisors.keys()].sort()
  for (const key of officeKeys) {
    const [clientName, officeName] = key.split('::') as [string, string]
    const clientId = clientIdByName.get(clientName)!
    const advisors = [...(officeAdvisors.get(key) || new Set<string>())]
    const isPrimary = !seenForClient.has(clientName)
    if (isPrimary) seenForClient.add(clientName)
    officeRows.push({
      client_id: clientId,
      name: officeName || 'Main',
      advisor_names: advisors.length ? advisors : null,
      is_primary: isPrimary
    })
  }
  console.log(`\nInserting ${officeRows.length} offices...`)
  const insertedOffices = (await pgInsert('offices', officeRows, [
    'id',
    'client_id',
    'name'
  ])) as { id: string; client_id: string; name: string }[]
  console.log(`  inserted ${insertedOffices.length} offices`)

  const officeIdByKey = new Map<string, string>() // clientName::officeName
  const clientNameById = new Map<string, string>()
  for (const c of insertedClients) clientNameById.set(c.id, c.name)
  for (const o of insertedOffices) {
    const cn = clientNameById.get(o.client_id)!
    officeIdByKey.set(`${cn}::${o.name}`, o.id)
  }

  function resolveClientAndOffice(
    groupName: string | null,
    advisorName: string | null,
    officeLocation: string | null
  ): { clientId: string | null; officeId: string | null; clientName: string } {
    const bucket = classifyClient(groupName, advisorName)
    const clientId = clientIdByName.get(bucket.name) ?? null
    const officeName = buildOfficeName(bucket.name, advisorName, officeLocation)
    const officeId = officeIdByKey.get(`${bucket.name}::${officeName}`) ?? null
    return { clientId, officeId, clientName: bucket.name }
  }

  // STEP 4: INSERT DM ORDERS
  console.log('\nStep 4: inserting DM orders...')
  type OrderInsert = {
    order_number: number
    client_id: string
    office_id: string | null
    advisor_name: string | null
    needs_direct_mail: boolean
    needs_digital: boolean
    class_type: string | null
    market: string | null
    charity: string | null
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
    start_time: string | null
    end_time: string | null
    time_notes: string | null
    mailing_quantity: number | null
    mailer_type: string | null
    mailer_return_address_override: any
    selected_mailer_design: string | null
    sending_list_folder_url: string | null
    qr_code_link: string | null
    client_approval_deadline: string | null
    order_sent_deadline: string | null
    first_class_day: string | null
    teledirect_added: string | null
    landing_page_url_direct: string | null
    dm_status: string | null
    order_instructions: string | null
  }

  const dmInserts: OrderInsert[] = []
  for (const r of dmRows) {
    const { clientId, officeId, clientName } = resolveClientAndOffice(
      r.group_name,
      r.advisor_name,
      r.office_location
    )
    if (!clientId) {
      logUnmapped({
        kind: 'dm-unmapped-client',
        order_number: r.order_number,
        group: r.group_name,
        advisor: r.advisor_name,
        office: r.office_location
      })
      continue
    }
    if (!officeId) {
      logUnmapped({
        kind: 'dm-unmapped-office',
        order_number: r.order_number,
        client: clientName,
        group: r.group_name,
        advisor: r.advisor_name,
        office: r.office_location
      })
    }
    dmInserts.push({
      order_number: r.order_number,
      client_id: clientId,
      office_id: officeId,
      advisor_name: r.advisor_name,
      needs_direct_mail: true,
      needs_digital: false,
      class_type: r.class_type,
      market: null,
      charity: r.charity,
      venue_text: r.venue_text,
      venue_address_text: r.venue_address_text,
      event_1_date: r.event_1_date,
      event_1_room: r.event_1_room,
      event_2_date: r.event_2_date,
      event_2_room: r.event_2_room,
      event_3_date: r.event_3_date,
      event_3_room: r.event_3_room,
      event_4_date: r.event_4_date,
      event_4_room: r.event_4_room,
      start_time: r.start_time,
      end_time: r.end_time,
      time_notes: r.time_notes,
      mailing_quantity: r.mailing_quantity,
      mailer_type: null,
      mailer_return_address_override: r.mailer_return_address
        ? { freeform: r.mailer_return_address }
        : null,
      selected_mailer_design: r.selected_mailer_design,
      sending_list_folder_url: r.sending_list_folder_url,
      qr_code_link: r.qr_code_link,
      client_approval_deadline: r.client_approval_deadline,
      order_sent_deadline: r.order_sent_deadline,
      first_class_day: r.first_class_day,
      teledirect_added: r.teledirect_added,
      landing_page_url_direct: r.landing_page_url,
      dm_status: r.status,
      order_instructions: r.order_instructions
    })
  }

  // De-dupe by order_number (the DM sheet sometimes repeats — keep first)
  const dmByNum = new Map<number, OrderInsert>()
  for (const o of dmInserts) {
    if (!dmByNum.has(o.order_number)) dmByNum.set(o.order_number, o)
  }
  const dmFinal = [...dmByNum.values()]
  let insertedDm: { id: string; order_number: number }[] = []
  for (let i = 0; i < dmFinal.length; i += 200) {
    const batch = dmFinal.slice(i, i + 200)
    const res = (await pgInsert('orders', batch, [
      'id',
      'order_number'
    ])) as { id: string; order_number: number }[]
    insertedDm = insertedDm.concat(res)
  }
  console.log(`  inserted ${insertedDm.length} DM orders`)

  const orderIdByNum = new Map<number, string>()
  for (const o of insertedDm) orderIdByNum.set(o.order_number, o.id)

  // STEP 5: PROCESS DIGITAL
  console.log('\nStep 5: processing Digital rows...')
  let maxOrderNum = 0
  for (const n of orderIdByNum.keys()) if (n > maxOrderNum) maxOrderNum = n
  // Also account for any explicit Digital order_number (unlikely here but safe)
  for (const r of digRows) {
    if (r.order_number && r.order_number > maxOrderNum) maxOrderNum = r.order_number
  }

  type DigitalUpdate = {
    order_id: string
    payload: any
  }
  const digitalUpdates: DigitalUpdate[] = []
  const digitalInserts: any[] = []
  let dmDigitalMerged = 0

  for (const r of digRows) {
    const { clientId, officeId, clientName } = resolveClientAndOffice(
      r.group_name,
      r.advisor_name,
      null
    )
    if (!clientId) {
      logUnmapped({
        kind: 'dig-unmapped-client',
        group: r.group_name,
        advisor: r.advisor_name
      })
      continue
    }

    const digitalPayload: Record<string, any> = {
      needs_digital: true,
      digital_budget: r.digital_budget,
      landing_page_url_digital: r.landing_page_url,
      privacy_company_name: r.privacy_company_name,
      privacy_company_website: r.privacy_company_website,
      digital_disclaimer: r.disclaimer,
      ethnicity_avoid: r.ethnicity_avoid,
      qa_status: r.qa_status,
      tp_status: r.tp_status,
      sheet_needed: r.sheet_needed,
      digital_status: r.status
    }

    if (r.order_number != null && orderIdByNum.has(r.order_number)) {
      const orderId = orderIdByNum.get(r.order_number)!
      digitalUpdates.push({ order_id: orderId, payload: digitalPayload })
      dmDigitalMerged++
    } else {
      // Insert a new digital-only order
      maxOrderNum++
      digitalInserts.push({
        order_number: maxOrderNum,
        client_id: clientId,
        office_id: officeId,
        advisor_name: r.advisor_name,
        needs_direct_mail: false,
        needs_digital: true,
        class_type: r.class_type,
        venue_text: r.venue_text,
        venue_address_text: r.venue_address_text,
        event_1_date: r.event_1_date,
        event_2_date: r.event_2_date,
        start_time: r.start_time,
        end_time: r.end_time,
        digital_budget: r.digital_budget,
        landing_page_url_digital: r.landing_page_url,
        privacy_company_name: r.privacy_company_name,
        privacy_company_website: r.privacy_company_website,
        digital_disclaimer: r.disclaimer,
        ethnicity_avoid: r.ethnicity_avoid,
        qa_status: r.qa_status,
        tp_status: r.tp_status,
        sheet_needed: r.sheet_needed,
        digital_status: r.status,
        notes: r.notes
      })
      if (!officeId) {
        logUnmapped({
          kind: 'dig-only-unmapped-office',
          assigned_order_number: maxOrderNum,
          client: clientName,
          group: r.group_name,
          advisor: r.advisor_name
        })
      }
    }
  }

  // Apply updates for DM rows merged with digital
  console.log(`  ${dmDigitalMerged} digital rows merged into existing DM orders`)
  for (const u of digitalUpdates) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${u.order_id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY!,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(u.payload)
      }
    )
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Digital update failed: ${text}`)
    }
  }
  console.log(`  ${digitalUpdates.length} digital updates applied`)

  let insertedDig: { id: string; order_number: number }[] = []
  for (let i = 0; i < digitalInserts.length; i += 200) {
    const batch = digitalInserts.slice(i, i + 200)
    const res = (await pgInsert('orders', batch, [
      'id',
      'order_number'
    ])) as { id: string; order_number: number }[]
    insertedDig = insertedDig.concat(res)
  }
  console.log(`  inserted ${insertedDig.length} digital-only orders`)

  for (const o of insertedDig) orderIdByNum.set(o.order_number, o.id)

  // STEP 6: order_events
  console.log('\nStep 6: writing order_events...')
  const allOrderIds = [
    ...insertedDm.map(o => o.id),
    ...insertedDig.map(o => o.id)
  ]
  const eventRows = allOrderIds.map(id => ({
    order_id: id,
    event: 'Imported from DM/Digital sheets'
  }))
  for (let i = 0; i < eventRows.length; i += 200) {
    const batch = eventRows.slice(i, i + 200)
    await pgInsert('order_events', batch, null)
  }
  console.log(`  inserted ${eventRows.length} order_events`)

  // Final breakdown
  const dmOnly = insertedDm.length - dmDigitalMerged
  const dmAndDigital = dmDigitalMerged
  const digitalOnly = insertedDig.length

  console.log('\n=== DONE ===')
  console.log(`clients:    ${insertedClients.length}`)
  console.log(`offices:    ${insertedOffices.length}`)
  console.log(`orders:     ${insertedDm.length + insertedDig.length}`)
  console.log(`  DM only:        ${dmOnly}`)
  console.log(`  DM + Digital:   ${dmAndDigital}`)
  console.log(`  Digital only:   ${digitalOnly}`)
  console.log(`\nFTA client uuid: ${ftaClientId}`)
  console.log(`Unmapped log:    ${UNMAPPED_LOG}`)
}

main().catch(err => {
  console.error('Import failed:', err)
  process.exit(1)
})
