/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * consolidate-clients.ts
 *
 * One-shot Supabase data cleanup — folds digital-sheet duplicate clients
 * back under their canonical group/firm (per plan
 * C:\Users\cah50\.claude\plans\glimmering-yawning-sunset.md).
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/consolidate-clients.ts
 */

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
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SQL failed (${res.status}): ${text}`)
  }
  return (await res.json()) as any[]
}

// orphan_client_name → { canonical_client, canonical_office }
const MERGES: Array<{ from: string; to: string; targetOffice: string }> = [
  { from: 'FTA NSV',           to: 'FTA',                                 targetOffice: 'Nashville' },
  { from: 'David Jones',       to: 'FTA',                                 targetOffice: 'South Carolina' },
  { from: 'William Warner',    to: 'Sentinel/SAM RIA',                    targetOffice: 'Will Warner - CT' },
  { from: 'Sean Mason',        to: 'Mason Street Wealth Management',      targetOffice: 'Sean Mason' },
  { from: 'Jason Smitka',      to: 'Scout Financial Group',               targetOffice: 'Jason Smitka' },
  { from: 'Alan Johnson',      to: 'Professional Group, Inc.',            targetOffice: 'Alan Johnson' },
  { from: 'Catherine Loquet',  to: 'Advanced Wealth Management',          targetOffice: 'Catherine Loquet' },
  { from: 'Lawrence',          to: 'John Lawrence',                       targetOffice: 'John Lawrence' }
]

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''")
}

async function main(): Promise<void> {
  console.log('=== Client consolidation ===\n')

  // Pre-check
  const [{ count: ordersBefore }] = await sql('SELECT count(*)::int AS count FROM orders')
  const [{ count: clientsBefore }] = await sql('SELECT count(*)::int AS count FROM clients')
  console.log(`Before:  clients=${clientsBefore}  orders=${ordersBefore}`)

  // Build one big transactional SQL string so the whole consolidation
  // runs atomically. If any statement fails the whole thing rolls back.
  const parts: string[] = ['BEGIN;']

  // Step 1: each merge
  for (const m of MERGES) {
    const fromName = sqlEscape(m.from)
    const toName   = sqlEscape(m.to)
    const ofcName  = sqlEscape(m.targetOffice)

    parts.push(`-- ${m.from} -> ${m.to} (office: ${m.targetOffice})`)
    parts.push(`
      UPDATE orders
      SET client_id = (SELECT id FROM clients WHERE name='${toName}'),
          office_id = (
            SELECT o.id FROM offices o
            JOIN clients c ON c.id = o.client_id
            WHERE c.name='${toName}' AND o.name='${ofcName}'
            LIMIT 1
          )
      WHERE client_id = (SELECT id FROM clients WHERE name='${fromName}');
    `)
    parts.push(`
      DELETE FROM offices
      WHERE client_id = (SELECT id FROM clients WHERE name='${fromName}');
    `)
    parts.push(`
      DELETE FROM clients WHERE name='${fromName}';
    `)
  }

  // Step 2: normalize 'FTA Chicago' -> 'FTA CHI' on orders.advisor_name
  parts.push(`-- normalize advisor name spelling`)
  parts.push(`
    UPDATE orders
    SET advisor_name = 'FTA CHI'
    WHERE advisor_name = 'FTA Chicago';
  `)

  // Step 3: normalize the same in offices.advisor_names[] arrays.
  // array_replace switches each element; the outer DISTINCT dedupes
  // when the array already contained both spellings.
  parts.push(`
    UPDATE offices
    SET advisor_names = sub.cleaned
    FROM (
      SELECT id,
             (SELECT array_agg(DISTINCT n)
              FROM unnest(array_replace(advisor_names, 'FTA Chicago', 'FTA CHI')) AS t(n)
             ) AS cleaned
      FROM offices
      WHERE 'FTA Chicago' = ANY(advisor_names)
    ) sub
    WHERE offices.id = sub.id;
  `)

  parts.push('COMMIT;')

  const txn = parts.join('\n')
  await sql(txn)
  console.log('Transaction committed.\n')

  // Post-check
  const [{ count: ordersAfter }] = await sql('SELECT count(*)::int AS count FROM orders')
  const [{ count: clientsAfter }] = await sql('SELECT count(*)::int AS count FROM clients')
  console.log(`After:   clients=${clientsAfter}  orders=${ordersAfter}`)

  if (ordersAfter !== ordersBefore) {
    console.error(`!!! Order count changed: ${ordersBefore} -> ${ordersAfter}`)
    process.exit(1)
  }

  // Specific assertions
  const fta = await sql(
    `SELECT count(*)::int AS n FROM orders o
     JOIN clients c ON c.id = o.client_id
     WHERE c.name='FTA';`
  )
  const chicagoLeft = await sql(
    `SELECT count(*)::int AS n FROM orders WHERE advisor_name='FTA Chicago';`
  )
  const offChicagoLeft = await sql(
    `SELECT count(*)::int AS n FROM offices WHERE 'FTA Chicago' = ANY(advisor_names);`
  )

  console.log('\nAssertions:')
  console.log(`  FTA orders:              ${fta[0].n}  (expected 173)`)
  console.log(`  orders.advisor_name='FTA Chicago':  ${chicagoLeft[0].n}  (expected 0)`)
  console.log(`  offices with 'FTA Chicago' in array: ${offChicagoLeft[0].n}  (expected 0)`)

  // List remaining client names + order counts so the user can scan
  const list = await sql(
    `SELECT c.name, count(o.id)::int AS orders
     FROM clients c LEFT JOIN orders o ON o.client_id = c.id
     GROUP BY c.name ORDER BY orders DESC NULLS LAST, c.name;`
  )
  console.log('\nFinal clients list:')
  for (const r of list) {
    console.log(`  ${String(r.orders).padStart(4)}  ${r.name}`)
  }
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
