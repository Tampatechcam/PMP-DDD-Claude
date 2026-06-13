/**
 * Backfill the digital-only campaigns from `Official Digital Jobs` that the
 * main importer skipped because their Order Number cell was blank. Each
 * row becomes an `orders` row with `needs_digital = true` and an
 * auto-assigned order_number above the current max.
 *
 * One-shot: run once, then add the missing-Order# rows back into the
 * source sheet's Order Number column for next time, or extend
 * scripts/import-real.ts to assign numbers on the fly.
 *
 *   node --env-file=.env.local --loader tsx scripts/import-digital-jobs.ts
 *   # or:
 *   npx tsx --env-file=.env.local scripts/import-digital-jobs.ts
 */

// One-shot import script. Excluded from tsconfig.
import fs from 'node:fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).')
  process.exit(1)
}

const COLS = [
  'status', 'advisor_name', 'group_name', 'first_event_raw', 'second_event_raw',
  'location_name', 'location_address', 'start_time_raw', 'end_time_raw',
  'class_type', 'qa_status', 'tp_status', 'sheet_needed', 'landing_url',
  'max_budget', 'notes', 'privacy_name', 'privacy_website', 'disclaimer',
  'ethnicity_avoid', 'order_number'
] as const

type Row = Record<(typeof COLS)[number], string>

function parseRows(md: string): Row[] {
  const lines = md.split('\n').filter((l) => l.startsWith('|'))
  // Drop header + separator rows.
  return lines.slice(2).map((line) => {
    const cells = line.split('|').slice(1, -1).map((s) => s.trim())
    const row = Object.fromEntries(COLS.map((c, i) => [c, cells[i] ?? ''])) as Row
    return row
  })
}

function parseDate(s: string): string | null {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function parseTime(s: string): string | null {
  if (!s) return null
  const m = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/.exec(s)
  if (!m) return null
  let h = Number(m[1])
  const mm = Number(m[2] ?? 0)
  const period = (m[3] ?? '').toUpperCase()
  if (period === 'PM' && h < 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
}

function parseMoney(s: string): number | null {
  if (!s) return null
  const cleaned = s.replace(/[\$,]/g, '').match(/-?\d+(\.\d+)?/)
  return cleaned ? Number(cleaned[0]) : null
}

async function sql<T = unknown>(query: string): Promise<T[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY!,
      authorization: `Bearer ${SERVICE_KEY!}`,
      'content-type': 'application/json',
      prefer: 'return=representation'
    },
    body: JSON.stringify({ query })
  })
  if (!r.ok) throw new Error(`sql ${r.status}: ${await r.text()}`)
  return r.json() as Promise<T[]>
}

// PostgREST doesn't expose arbitrary SQL by default — use the Management
// API SQL endpoint with the PAT instead.
const PAT = process.env.SUPABASE_ACCESS_TOKEN ?? ''
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ??
  SUPABASE_URL.replace('https://', '').split('.')[0]!

async function adminSql<T = unknown>(query: string): Promise<T[]> {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${PAT}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ query })
    }
  )
  if (!r.ok) throw new Error(`adminSql ${r.status}: ${await r.text()}`)
  return r.json() as Promise<T[]>
}

async function lookupClientByGroup(): Promise<Map<string, string>> {
  const rows = await adminSql<{ id: string; name: string }>(
    'select id, name from clients'
  )
  return new Map(
    rows.map((r) => [r.name.toLowerCase().replace(/\s+/g, ' ').trim(), r.id])
  )
}

async function lookupOfficeByAdvisor(): Promise<
  Map<string, { office_id: string; client_id: string }>
> {
  const rows = await adminSql<{
    id: string
    name: string
    advisor_names: string[] | null
    client_id: string
  }>('select id, name, advisor_names, client_id from offices')
  const m = new Map<string, { office_id: string; client_id: string }>()
  for (const o of rows) {
    const entry = { office_id: o.id, client_id: o.client_id }
    const key = o.name.toLowerCase().trim()
    if (!m.has(key)) m.set(key, entry)
    for (const a of o.advisor_names ?? []) {
      const k = a.toLowerCase().trim()
      if (!m.has(k)) m.set(k, entry)
    }
  }
  return m
}

function escSql(s: string | number | null | undefined): string {
  if (s == null) return 'NULL'
  if (typeof s === 'number') return String(s)
  return `'${s.replace(/'/g, "''")}'`
}

async function main() {
  const md = fs.readFileSync('scripts/.import-work/digital-jobs.md', 'utf8')
  const rows = parseRows(md)

  // Only rows WITHOUT an order number — the rest were imported already.
  const missing = rows.filter((r) => !/^[0-9]+$/.test(r.order_number))
  console.log(`Total rows: ${rows.length}, missing order_number: ${missing.length}`)

  const [maxRow] = await adminSql<{ max: number }>(
    'select coalesce(max(order_number), 0) as max from orders'
  )
  let nextOrderNumber = (maxRow!.max as number) + 1
  console.log(`Starting at order_number ${nextOrderNumber}`)

  const clientByName = await lookupClientByGroup()
  const officeByAdvisor = await lookupOfficeByAdvisor()

  // Bulk insert via one big multi-row SQL statement.
  const inserts: string[] = []
  let unmapped = 0
  let blankSkipped = 0
  let autoCreated = 0
  for (const r of missing) {
    // Skip blank rows in the sheet — no advisor at all, nothing to map.
    if (!r.advisor_name.trim() && !r.group_name.trim()) {
      blankSkipped++
      continue
    }

    const groupKey = (r.group_name || r.advisor_name)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
    const advisorKey = r.advisor_name.toLowerCase().trim()

    // Three-tier match: office by advisor → office by group name →
    // client by name. The first one that lands wins, and an office hit
    // gives us its client_id directly.
    const officeHit =
      officeByAdvisor.get(advisorKey) ?? officeByAdvisor.get(groupKey)
    let client_id =
      officeHit?.client_id ??
      clientByName.get(groupKey) ??
      clientByName.get(advisorKey)
    let office_id = officeHit?.office_id ?? null

    // Still nothing? Auto-create a client + office for this new advisor
    // so the row makes it in. Caches the new ids on the maps so the
    // next campaign for the same advisor reuses them.
    if (!client_id) {
      const newClientName = (r.group_name || r.advisor_name).trim()
      const newOfficeName = r.advisor_name.trim() || newClientName
      const created = await adminSql<{ client_id: string; office_id: string }>(
        `with c as (
           insert into clients (name, is_group, responsibility)
           values (${escSql(newClientName)}, false, 'Auto-created from Digital Jobs')
           returning id
         ),
         o as (
           insert into offices (client_id, name, advisor_names, is_primary)
           select id, ${escSql(newOfficeName)}, ARRAY[${escSql(r.advisor_name.trim() || newOfficeName)}], true
           from c
           returning id, client_id
         )
         select o.client_id, o.id as office_id from o`
      )
      const row = created[0]!
      client_id = row.client_id
      office_id = row.office_id
      clientByName.set(groupKey, client_id)
      clientByName.set(advisorKey, client_id)
      officeByAdvisor.set(advisorKey, { office_id, client_id })
      autoCreated++
    }

    const values = [
      nextOrderNumber++,
      escSql(client_id),
      office_id ? escSql(office_id) : 'NULL',
      escSql(r.advisor_name || null),
      'FALSE', // needs_direct_mail
      'TRUE',  // needs_digital
      'FALSE', // needs_google_sheet
      escSql(r.class_type || null),
      escSql(r.location_name || null),
      escSql(r.location_address || null),
      parseDate(r.first_event_raw) ? `'${parseDate(r.first_event_raw)}'` : 'NULL',
      parseDate(r.second_event_raw) ? `'${parseDate(r.second_event_raw)}'` : 'NULL',
      parseTime(r.start_time_raw) ? `'${parseTime(r.start_time_raw)}'` : 'NULL',
      parseTime(r.end_time_raw) ? `'${parseTime(r.end_time_raw)}'` : 'NULL',
      escSql(r.notes || null),
      escSql(parseMoney(r.max_budget)),
      escSql(r.landing_url || null),
      escSql(r.privacy_name || null),
      escSql(r.privacy_website || null),
      escSql(r.disclaimer || null),
      escSql(r.ethnicity_avoid || null),
      escSql(r.qa_status || null),
      escSql(r.tp_status || null),
      escSql(r.sheet_needed || null),
      escSql(r.status || null)
    ]
    inserts.push(`(${values.join(', ')})`)
  }
  console.log(
    `Built ${inserts.length} inserts; ${autoCreated} new clients auto-created; ${unmapped} unmapped; ${blankSkipped} blank rows skipped`
  )

  if (inserts.length === 0) {
    console.log('Nothing to insert.')
    return
  }

  const cols = [
    'order_number', 'client_id', 'office_id', 'advisor_name',
    'needs_direct_mail', 'needs_digital', 'needs_google_sheet',
    'class_type', 'venue_text', 'venue_address_text',
    'event_1_date', 'event_2_date', 'start_time', 'end_time',
    'time_notes', 'digital_budget', 'landing_page_url_digital',
    'privacy_company_name', 'privacy_company_website', 'digital_disclaimer',
    'ethnicity_avoid', 'qa_status', 'tp_status', 'sheet_needed', 'digital_status'
  ]
  // Chunk to keep the SQL payload reasonable.
  const CHUNK = 25
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const slice = inserts.slice(i, i + CHUNK)
    const query = `insert into orders (${cols.join(',')}) values ${slice.join(',')} returning order_number`
    const out = await adminSql<{ order_number: number }>(query)
    console.log(`Inserted ${out.length} (range ${out[0]!.order_number}…${out[out.length - 1]!.order_number})`)
  }

  // Audit row per inserted order.
  await adminSql(`
    insert into order_events (order_id, event, payload)
    select id, 'Imported from Digital Jobs sheet', '{"source":"digital-jobs"}'::jsonb
    from orders where order_number >= ${(maxRow!.max as number) + 1}
  `)

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
