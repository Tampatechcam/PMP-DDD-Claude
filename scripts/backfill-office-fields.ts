/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * backfill-office-fields.ts
 *
 * One-shot — populates four columns on `offices` from existing data so
 * the admin client detail page can show region/contact info per office
 * without aggregating at render time:
 *
 *   - state                     ← extracted from orders.venue_address_text
 *   - registration_phone        ← from DM CSV "Registration Phone Number"
 *   - registration_url_direct   ← from orders.landing_page_url_direct
 *   - mailer_return_address     ← from orders.mailer_return_address_override
 *
 * For each office, we take the modal value across that office's orders.
 * Idempotent — re-running just refreshes from current data.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/backfill-office-fields.ts
 */

import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { join } from 'path'

const PROJECT_REF = 'amtunktskgwvvqumrbde'
const PAT =
  process.env.SUPABASE_MANAGEMENT_PAT ||
  'REDACTED_SUPABASE_PAT'

async function sql(query: string): Promise<any[]> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    }
  )
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${await res.text()}`)
  return (await res.json()) as any[]
}

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}
function sqlJsonb(obj: unknown): string {
  return `${sqlString(JSON.stringify(obj))}::jsonb`
}

/** US-state regex: matches ", IL 60103" → "IL". Returns null if no match. */
function extractState(addr: string | null | undefined): string | null {
  if (!addr) return null
  const m = addr.match(/,\s*([A-Z]{2})\s+\d{5}/)
  return m ? m[1]! : null
}

/** Modal selection — returns the value seen most often, or null if empty. */
function modal<T>(counts: Map<T, number>): T | null {
  let best: T | null = null
  let bestN = 0
  for (const [k, n] of counts) {
    if (n > bestN) { best = k; bestN = n }
  }
  return best
}

async function main(): Promise<void> {
  console.log('=== Backfill office fields ===\n')

  // 1. Parse DM CSV → order_number → phone
  const csvPath = join(process.cwd(), 'scripts', '.import-work', 'direct-mail.csv')
  const raw = readFileSync(csvPath, 'utf8')
  const csvRows: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: false,
    relax_quotes: true,
    relax_column_count: true
  })
  const phoneByOrderNum = new Map<number, string>()
  for (const r of csvRows) {
    const onStr = (r['Order Number'] ?? '').trim()
    if (!onStr) continue
    const num = Number(onStr)
    if (!Number.isInteger(num)) continue
    const phone = (r['Registration Phone Number'] ?? '').trim()
    if (phone) phoneByOrderNum.set(num, phone.replace(/\s+$/, ''))
  }
  console.log(`CSV: ${phoneByOrderNum.size} orders with registration_phone`)

  // 2. Fetch orders with the fields we care about
  const orders = await sql(`
    SELECT id, order_number, office_id, venue_address_text,
           landing_page_url_direct, mailer_return_address_override
    FROM orders
    WHERE office_id IS NOT NULL
  `)
  console.log(`DB: ${orders.length} orders with office_id`)

  // 3. Aggregate per office
  type Bucket = {
    states: Map<string, number>
    phones: Map<string, number>
    urls:   Map<string, number>
    /** Key is JSON-serialized addr (for modal counting); value remembers original */
    addrs:  Map<string, { count: number; value: any }>
  }
  const byOffice = new Map<string, Bucket>()
  const newBucket = (): Bucket => ({
    states: new Map(), phones: new Map(), urls: new Map(), addrs: new Map()
  })

  for (const o of orders) {
    const bucket = byOffice.get(o.office_id) ?? newBucket()
    byOffice.set(o.office_id, bucket)

    const st = extractState(o.venue_address_text)
    if (st) bucket.states.set(st, (bucket.states.get(st) ?? 0) + 1)

    const phone = phoneByOrderNum.get(o.order_number)
    if (phone) bucket.phones.set(phone, (bucket.phones.get(phone) ?? 0) + 1)

    if (o.landing_page_url_direct) {
      bucket.urls.set(o.landing_page_url_direct,
        (bucket.urls.get(o.landing_page_url_direct) ?? 0) + 1)
    }

    if (o.mailer_return_address_override) {
      const key = JSON.stringify(o.mailer_return_address_override)
      const prev = bucket.addrs.get(key)
      if (prev) prev.count++
      else bucket.addrs.set(key, { count: 1, value: o.mailer_return_address_override })
    }
  }

  // 4. Build UPDATE statements per office
  let stateN = 0, phoneN = 0, urlN = 0, addrN = 0
  const updates: string[] = []
  for (const [officeId, b] of byOffice) {
    const state = modal(b.states)
    const phone = modal(b.phones)
    const url   = modal(b.urls)
    let addrJson: any = null
    let bestN = 0
    for (const { count, value } of b.addrs.values()) {
      if (count > bestN) { addrJson = value; bestN = count }
    }
    const sets: string[] = []
    if (state) { sets.push(`state = ${sqlString(state)}`); stateN++ }
    if (phone) { sets.push(`registration_phone = ${sqlString(phone)}`); phoneN++ }
    if (url)   { sets.push(`registration_url_direct = ${sqlString(url)}`); urlN++ }
    if (addrJson) { sets.push(`mailer_return_address = ${sqlJsonb(addrJson)}`); addrN++ }
    if (sets.length === 0) continue
    updates.push(`UPDATE offices SET ${sets.join(', ')} WHERE id = ${sqlString(officeId)};`)
  }

  console.log(`\nPreparing to update ${updates.length} offices:`)
  console.log(`  state:                  ${stateN}`)
  console.log(`  registration_phone:     ${phoneN}`)
  console.log(`  registration_url_direct:${urlN}`)
  console.log(`  mailer_return_address:  ${addrN}`)

  if (updates.length === 0) {
    console.log('Nothing to do.')
    return
  }

  // 5. Run as one transactional batch
  await sql(['BEGIN;', ...updates, 'COMMIT;'].join('\n'))
  console.log('\nCommitted.\n')

  // 6. Verify
  const verify = await sql(`
    SELECT
      (SELECT count(*)::int FROM offices WHERE state IS NOT NULL) AS with_state,
      (SELECT count(*)::int FROM offices WHERE registration_phone IS NOT NULL) AS with_phone,
      (SELECT count(*)::int FROM offices WHERE registration_url_direct IS NOT NULL) AS with_url,
      (SELECT count(*)::int FROM offices WHERE mailer_return_address IS NOT NULL) AS with_addr,
      (SELECT count(*)::int FROM offices) AS total
  `)
  console.log('Post-state on offices:')
  console.log(verify[0])
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
