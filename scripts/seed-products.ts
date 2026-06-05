/**
 * seed-products.ts — seed the products catalog from the real Stripe price_ids
 * derived from invoiced line items (see the pricing analysis). Idempotent:
 * upserts one active row per product by (name, category); reuses the existing
 * Stripe price_id so generateInvoice can push real products. Percent fees get
 * no price_id (computed). Run: npx tsx --env-file=.env.local scripts/seed-products.ts
 */
import 'dotenv/config'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

type Row = {
  name: string
  category: 'dm_mailer' | 'digital' | 'tech' | 'fee'
  unit: 'per_piece' | 'flat' | 'percent'
  price: number
  stripe_price_id: string | null
  sort: number
  notes?: string
}

const CATALOG: Row[] = [
  // --- DM mailers (per piece) — latest observed price_id per product ---
  { name: 'Tabbed Bi-fold', category: 'dm_mailer', unit: 'per_piece', price: 0.75, stripe_price_id: 'price_1Rq1ydEH2iV7BF5PgzzSUgoW', sort: 10 },
  { name: '11x17 Quadfold Tabbed', category: 'dm_mailer', unit: 'per_piece', price: 0.77, stripe_price_id: 'price_1S8RwBEH2iV7BF5Pzrwgezet', sort: 20 },
  { name: 'Bi-Fold W/ Envelope', category: 'dm_mailer', unit: 'per_piece', price: 0.77, stripe_price_id: 'price_1RmJoJEH2iV7BF5PHE1vDzHa', sort: 30 },
  { name: '11x17 Quadfold W/ Envelope', category: 'dm_mailer', unit: 'per_piece', price: 0.81, stripe_price_id: 'price_1Rq21fEH2iV7BF5PYG211FIp', sort: 40 },
  { name: 'Bi-Fold in Envelope - Non-Profit', category: 'dm_mailer', unit: 'per_piece', price: 0.62, stripe_price_id: 'price_1Rx3hKEH2iV7BF5Pdlg22PQ5', sort: 50 },
  { name: 'Quadfold in Envelope - Non-Profit', category: 'dm_mailer', unit: 'per_piece', price: 0.66, stripe_price_id: 'price_1SFeBBEH2iV7BF5Pqz9VsTbd', sort: 60 },
  { name: 'NON PROFIT 8.5x11 Trifold', category: 'dm_mailer', unit: 'per_piece', price: 0.62, stripe_price_id: 'price_1T83QdEH2iV7BF5P1hcQkU7O', sort: 70 },
  { name: '8.5x11 bi fold', category: 'dm_mailer', unit: 'per_piece', price: 0.64, stripe_price_id: 'price_1NXtO7EH2iV7BF5P9203Y5If', sort: 80 },
  // --- Digital (flat) ---
  { name: 'Digital Marketing Budget (Standard)', category: 'digital', unit: 'flat', price: 840, stripe_price_id: 'price_1Qdio1EH2iV7BF5PeUvgNcRr', sort: 10 },
  { name: 'Premium Digital Marketing Budget', category: 'digital', unit: 'flat', price: 1700, stripe_price_id: 'price_1Ri5I7EH2iV7BF5PRYoFum4y', sort: 20 },
  { name: 'FTA – R90/W101 Digital Class Budget', category: 'digital', unit: 'flat', price: 3500, stripe_price_id: 'price_1Stt6XEH2iV7BF5PawacPuUk', sort: 30 },
  { name: '$1000 Digital Boost', category: 'digital', unit: 'flat', price: 1000, stripe_price_id: 'price_1SmN7hEH2iV7BF5PeANnP4ZA', sort: 40 },
  { name: 'Digital Retainer', category: 'digital', unit: 'flat', price: 5000, stripe_price_id: 'price_1QpvjbEH2iV7BF5PZpMsmKBD', sort: 50 },
  // --- Tech / sequences (flat) ---
  { name: 'Phone registration', category: 'tech', unit: 'flat', price: 100, stripe_price_id: 'price_1RbPnGEH2iV7BF5PSFt4jYuV', sort: 10 },
  { name: 'Lead nurture system ($250)', category: 'tech', unit: 'flat', price: 250, stripe_price_id: 'price_1QdimkEH2iV7BF5PDUvL5CEd', sort: 20 },
  { name: 'Lead nurture system ($300)', category: 'tech', unit: 'flat', price: 300, stripe_price_id: 'price_1R3l3UEH2iV7BF5P9PdOa7jy', sort: 30 },
  { name: 'TeleDirect', category: 'tech', unit: 'flat', price: 180, stripe_price_id: 'price_1QdihhEH2iV7BF5PQoAo4SL1', sort: 40 },
  { name: 'Landing page', category: 'tech', unit: 'flat', price: 100, stripe_price_id: 'price_1QdiiDEH2iV7BF5PmGVtC5Tj', sort: 50 },
  { name: '$1,250 Turn-Key Workshop', category: 'tech', unit: 'flat', price: 1250, stripe_price_id: 'price_1RTSMQEH2iV7BF5Pq5GDkYAf', sort: 60 },
  // --- Fees (percent, computed — no Stripe price) ---
  { name: 'Card processing fee', category: 'fee', unit: 'percent', price: 3, stripe_price_id: null, sort: 10, notes: '3% of pre-tax subtotal' },
  { name: 'FL Sales Tax', category: 'fee', unit: 'percent', price: 7, stripe_price_id: null, sort: 20, notes: 'Applied via Stripe TaxRate STRIPE_FL_TAX_RATE_ID, FL offices, DM line only' },
]

const rest = async (path: string, init?: RequestInit) => {
  const r = await fetch(URL + '/rest/v1/' + path, {
    ...init,
    headers: { apikey: KEY, authorization: 'Bearer ' + KEY, 'content-type': 'application/json', ...(init?.headers || {}) },
  })
  if (!r.ok) throw new Error(path + ': ' + r.status + ' ' + (await r.text()))
  const text = await r.text()
  return text ? JSON.parse(text) : null
}
const enc = (s: string) => encodeURIComponent(s)

async function main() {
  let inserted = 0, updated = 0
  for (const row of CATALOG) {
    // The derived price_ids are LIVE-mode (real invoices). We can't use them with
    // a test key, so seed with stripe_price_id=null (generateInvoice falls back to
    // computed amounts) and keep the live id as a reference note. When the app runs
    // with live keys, populate stripe_price_id from these to activate the product
    // line. The catalog still drives form pre-fill + the editable pricing sheet.
    const refNote = row.stripe_price_id ? `live price ${row.stripe_price_id}` : null
    const notes = [row.notes, refNote].filter(Boolean).join(' · ') || null
    const body = { name: row.name, category: row.category, unit: row.unit, price: row.price, stripe_price_id: null, sort: row.sort, notes, active: true }
    const existing: any[] = await rest(`products?name=eq.${enc(row.name)}&category=eq.${row.category}&select=id`)
    if (existing.length) {
      await rest(`products?id=eq.${existing[0].id}`, { method: 'PATCH', body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }) })
      updated++
    } else {
      await rest('products', { method: 'POST', body: JSON.stringify(body) })
      inserted++
    }
  }
  console.log(`seed-products: ${inserted} inserted, ${updated} updated (${CATALOG.length} total)`)
}
main().catch((e) => { console.error('ERR', e?.message || e); process.exit(1) })
