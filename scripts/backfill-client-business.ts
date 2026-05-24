/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * backfill-client-business.ts
 *
 * Fills the clients table's business/defaults/pricing/notes fields from
 * the local Client Dictionary markdown (scripts/.import-work/client-dict.md).
 *
 * The dictionary's rows are at the OFFICE level (Dallas, Will Warner - CT,
 * etc.) so multiple rows roll up to one client. For each canonical client
 * we take the modal value across its rows. Idempotent.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/backfill-client-business.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const PROJECT_REF = 'amtunktskgwvvqumrbde'
const PAT =
  process.env.SUPABASE_MANAGEMENT_PAT ||
  'REDACTED_SUPABASE_PAT'

async function sql(query: string): Promise<any[]> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    { method: 'POST',
      headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }) }
  )
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${await res.text()}`)
  return (await res.json()) as any[]
}

const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`

// --- classifyClient: matches scripts/import-v2.ts logic, scoped to what
// the dictionary's "FMO/Group Name" column actually contains.
const INDEPENDENT_FIRM_ALIASES: Record<string, string> = {
  'scout financial group': 'Scout Financial Group',
  'bone asset management': 'Bone Asset Management',
  'the otoole group': "The O'Toole Group",
  "the o'toole group": "The O'Toole Group",
  'eagle financial solutions': 'Eagle Financial Solutions',
  'eagle': 'Eagle Financial Solutions',
  'mason street wealth management': 'Mason Street Wealth Management',
  'mcguire insurance & retirement solutions': 'McGuire Insurance & Retirement Solutions',
  'professional group, inc.': 'Professional Group, Inc.',
  'professional group inc.': 'Professional Group, Inc.',
  'fwm': 'Michael Foguth Financial Group LLC',
  'foguth financial group': 'Michael Foguth Financial Group LLC',
  'advanced wealth management': 'Advanced Wealth Management',
  // The dictionary uses these advisor names as a one-off "group" for
  // AdvisorMax members — when group is AdvisorMax, the advisor is the
  // sub-identity but the client is still AdvisorMax.
}

function classifyClient(rawGroup: string | null, advisor: string | null): string {
  const g = (rawGroup || '').trim()
  const gLower = g.toLowerCase()
  if (
    gLower === 'fta' ||
    gLower.startsWith('fta ') ||
    gLower.startsWith('fta-') ||
    gLower.includes('financial & tax architects') ||
    gLower.includes('financial tax architects')
  ) return 'FTA'
  if (
    gLower === 'sam ria' || gLower === 'sam-ria' ||
    gLower.startsWith('sam ria') || gLower.startsWith('sam-ria') ||
    gLower === 'sentinel' || gLower.includes('sam ria') ||
    gLower.includes('sentinel asset management')
  ) return 'Sentinel/SAM RIA'
  if (gLower === 'advisormax' || gLower === 'advisor max' || gLower === 'advisormax, llc') {
    return 'AdvisorMax'
  }
  if (gLower.startsWith('arrive ') || gLower === 'arrive') return 'Arrive Financial Services'
  if (g) return INDEPENDENT_FIRM_ALIASES[gLower] ?? g
  if (advisor) return INDEPENDENT_FIRM_ALIASES[advisor.toLowerCase()] ?? advisor.trim()
  return 'Unknown'
}

// --- markdown table parser ---
type Row = Record<string, string>

function parseMd(md: string): Row[] {
  // The Client Dictionary export contains MULTIPLE markdown tables
  // concatenated, each with its own header line (e.g., second table at
  // line 41 reorders columns — Mailing Quantity moves from col 32 to
  // col 5). Detect each header and parse its rows against its own
  // column map.
  const lines = md.split('\n').filter(l => l.trim().startsWith('|'))
  const cells = (line: string): string[] =>
    line.split('|').slice(1, -1).map(s => s.trim())
  const isSeparator = (c: string[]) => c.every(x => /^[-: ]*$/.test(x))
  const isHeader = (line: string) => /^\|\s*Advisor Name\b/.test(line)

  const out: Row[] = []
  let header: string[] | null = null
  for (const line of lines) {
    if (isHeader(line)) {
      header = cells(line)
      continue
    }
    const c = cells(line)
    if (isSeparator(c)) continue
    if (!header) continue
    const row: Row = {}
    for (let j = 0; j < header.length; j++) row[header[j]!] = c[j] ?? ''
    out.push(row)
  }
  return out
}

const blank = (v: string | undefined | null): string | null => {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || s === '-' || s === 'N/A' || s === 'n/a' || s === 'TBD') return null
  return s
}

const parseMoney = (s: string | null | undefined): number | null => {
  const v = blank(s)
  if (!v) return null
  // Match a decimal like ".077" first (matches "$.077"), then a plain
  // integer/decimal. Without the leading branch ".077" silently became 77.
  const m = v.replace(/[,$\s]/g, '').match(/-?\d*\.\d+|-?\d+/)
  return m ? Number(m[0]) : null
}

const parseInt_ = (s: string | null | undefined): number | null => {
  const v = blank(s)
  if (!v) return null
  if (/variable/i.test(v)) return null
  const m = v.replace(/[,\s]/g, '').match(/\d+/)
  return m ? Number(m[0]) : null
}

const parseBool = (s: string | null | undefined): boolean | null => {
  const v = blank(s)
  if (!v) return null
  if (/^yes$/i.test(v)) return true
  if (/^no$/i.test(v)) return false
  return null
}

/** Modal pick across an array of (possibly null) values. */
function modal<T>(values: (T | null | undefined)[]): T | null {
  const counts = new Map<string, { value: T; count: number }>()
  for (const v of values) {
    if (v == null) continue
    const key = String(v)
    const e = counts.get(key)
    if (e) e.count++
    else counts.set(key, { value: v, count: 1 })
  }
  let best: T | null = null
  let bestN = 0
  for (const e of counts.values()) {
    if (e.count > bestN) { best = e.value; bestN = e.count }
  }
  return best
}

/**
 * For identity fields (business_name, EIN, website) — return the value
 * only if all non-null rows agree. AdvisorMax has different business
 * names per member; picking one would be misleading, so leave null.
 */
function unanimous<T>(values: (T | null | undefined)[]): T | null {
  let pick: T | null = null
  for (const v of values) {
    if (v == null) continue
    if (pick == null) pick = v
    else if (String(pick) !== String(v)) return null
  }
  return pick
}

async function main(): Promise<void> {
  console.log('=== Backfill client business fields ===\n')

  const md = readFileSync(join(process.cwd(), 'scripts', '.import-work', 'client-dict.md'), 'utf8')
  const rows = parseMd(md)
  console.log(`Parsed ${rows.length} rows from client-dict.md`)

  // Group by canonical client name.
  type RawRow = {
    business_name: string | null
    business_website: string | null
    ein: string | null
    ein_match_name: string | null
    is_non_profit: boolean | null
    responsibility: string | null
    disclaimer: string | null
    description: string | null
    notes: string | null
    default_mailer_type: string | null
    default_class_type: string | null
    default_mailer_rate: number | null
    default_mailing_quantity: number | null
    default_digital_budget: number | null
    tech_sequences: string | null
    direct_mail_discount: string | null
    start_before_paid: boolean | null
  }
  const byClient = new Map<string, RawRow[]>()

  for (const r of rows) {
    const group = blank(r['FMO/Group Name (Optional)'])
    const advisor = blank(r['Advisor Name'])
    const canonical = classifyClient(group, advisor)
    if (!canonical || canonical === 'Unknown') continue

    const rec: RawRow = {
      business_name:       blank(r['Business Name']),
      business_website:    blank(r['Business Website']),
      ein:                 blank(r['EIN']),
      ein_match_name:      blank(r['Company Name (EIN Match)']),
      is_non_profit:       parseBool(r['Non-Profit Status']),
      responsibility:      blank(r['Responsibility']),
      disclaimer:          blank(r['Disclaimer']),
      description:         blank(r['Description of Client']),
      notes:               blank(r['Client Notes to Lookout for']),
      default_mailer_type: blank(r['Mailer Type Used']),
      default_class_type:  blank(r['Perferred Mailer Topics']),
      default_mailer_rate: parseMoney(r['Direct Mailer Rate (per, QA Always)']),
      default_mailing_quantity: parseInt_(r['Usual Mailing Quanity (QA Always)']),
      default_digital_budget:   parseMoney(r['Default Digital Marketing Budget (QA Always)']),
      tech_sequences:      blank(r['Tech/Sequences']),
      direct_mail_discount: blank(r['Any Direct Mail Discounts']),
      start_before_paid:   parseBool(r['Start Orders Before Being Paid'])
    }

    const list = byClient.get(canonical) ?? []
    list.push(rec)
    byClient.set(canonical, list)
  }
  console.log(`Aggregated into ${byClient.size} canonical client buckets`)

  // Look up which clients exist in the DB.
  const existing = await sql('SELECT id, name FROM clients ORDER BY name')
  const idByName = new Map<string, string>(existing.map((c: any) => [c.name, c.id]))

  // Build UPDATEs (only for clients we actually have in the DB).
  const updates: string[] = []
  let touched = 0
  let unmatched: string[] = []
  for (const [canonical, list] of byClient) {
    const clientId = idByName.get(canonical)
    if (!clientId) {
      unmatched.push(canonical)
      continue
    }
    // Always set — null overwrites prior values (cleans up the off-by-one
    // mess the first parser created before the second-table fix).
    const sets: string[] = []
    const sn = (col: string, val: string | null) => {
      sets.push(`${col} = ${val ? sqlString(val) : 'NULL'}`)
    }
    const sni = (col: string, val: number | null) => {
      sets.push(`${col} = ${val != null ? val : 'NULL'}`)
    }
    const snb = (col: string, val: boolean | null) => {
      sets.push(`${col} = ${val != null ? val : 'NULL'}`)
    }
    // Identity fields require unanimity — leaving them null on groups
    // whose members disagree (AdvisorMax has different business names
    // per advisor; picking one would mislead).
    sn('business_name',       unanimous(list.map(r => r.business_name)))
    sn('business_website',    unanimous(list.map(r => r.business_website)))
    sn('ein',                 unanimous(list.map(r => r.ein)))
    sn('ein_match_name',      unanimous(list.map(r => r.ein_match_name)))
    snb('is_non_profit',      modal(list.map(r => r.is_non_profit)))
    sn('responsibility',      modal(list.map(r => r.responsibility)))
    sn('disclaimer',          modal(list.map(r => r.disclaimer)))
    sn('description',         modal(list.map(r => r.description)))
    sn('notes',               modal(list.map(r => r.notes)))
    sn('default_mailer_type', modal(list.map(r => r.default_mailer_type)))
    sn('default_class_type',  modal(list.map(r => r.default_class_type)))
    sni('default_mailer_rate', modal(list.map(r => r.default_mailer_rate)))
    sni('default_mailing_quantity', modal(list.map(r => r.default_mailing_quantity)))
    sni('default_digital_budget', modal(list.map(r => r.default_digital_budget)))
    sn('tech_sequences',      modal(list.map(r => r.tech_sequences)))
    sn('direct_mail_discount', modal(list.map(r => r.direct_mail_discount)))
    snb('start_before_paid',  modal(list.map(r => r.start_before_paid)))
    if (sets.length === 0) continue
    updates.push(`UPDATE clients SET ${sets.join(', ')} WHERE id = ${sqlString(clientId)};`)
    touched++
  }

  console.log(`\nWill update ${touched} clients.`)
  if (unmatched.length) {
    console.log(`Unmatched dictionary buckets (no client row in DB): ${unmatched.length}`)
    for (const u of unmatched) console.log('  -', u)
  }

  if (updates.length === 0) {
    console.log('Nothing to do.')
    return
  }

  await sql(['BEGIN;', ...updates, 'COMMIT;'].join('\n'))
  console.log('Committed.\n')

  // Verify
  const verify = await sql(`
    SELECT
      (SELECT count(*)::int FROM clients WHERE business_name IS NOT NULL) AS biz_name,
      (SELECT count(*)::int FROM clients WHERE ein IS NOT NULL) AS ein,
      (SELECT count(*)::int FROM clients WHERE disclaimer IS NOT NULL) AS disclaimer,
      (SELECT count(*)::int FROM clients WHERE default_mailer_rate IS NOT NULL) AS mailer_rate,
      (SELECT count(*)::int FROM clients WHERE responsibility IS NOT NULL) AS resp,
      (SELECT count(*)::int FROM clients) AS total
  `)
  console.log(verify[0])
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
