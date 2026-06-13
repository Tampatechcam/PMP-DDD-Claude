/**
 * One-off Stripe setup. Idempotent.
 *
 *   npx tsx scripts/stripe-setup.ts
 *
 * Creates the 7% Florida sales-tax rate and prints its id. Paste the id into
 * STRIPE_FL_TAX_RATE_ID (.env.local for test, the host's env for live). Stripe
 * TaxRate objects are immutable, so re-running won't mutate an existing rate —
 * the script looks for an active 7% rate named "FL Sales Tax" and reuses it
 * instead of creating duplicates.
 *
 * Requires STRIPE_SECRET_KEY in the environment (test key for setup-by-dev).
 */
import Stripe from 'stripe'
import { FL_TAX_RATE } from '../lib/invoices/compute'

const DISPLAY_NAME = 'FL Sales Tax'
// Number() drops the float artifact (0.07 * 100 = 7.0000…1); Stripe wants ≤4 dp.
const PERCENTAGE = Number((FL_TAX_RATE * 100).toFixed(4)) // 7

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.error('STRIPE_SECRET_KEY is not set. Add a test key and retry.')
    process.exit(1)
  }
  const stripe = new Stripe(key)

  // Reuse an existing active 7% "FL Sales Tax" rate if present.
  const existing = await stripe.taxRates.list({ active: true, limit: 100 })
  const match = existing.data.find(
    (r) => r.display_name === DISPLAY_NAME && r.percentage === PERCENTAGE
  )
  if (match) {
    console.log(`Found existing FL tax rate. Reusing.\n`)
    console.log(`STRIPE_FL_TAX_RATE_ID=${match.id}`)
    return
  }

  const rate = await stripe.taxRates.create({
    display_name: DISPLAY_NAME,
    description: 'Florida state sales tax on printed direct mail',
    percentage: PERCENTAGE,
    inclusive: false,
    country: 'US',
    state: 'FL',
    jurisdiction: 'FL',
  })

  console.log(`Created FL tax rate (${PERCENTAGE}%).\n`)
  console.log(`STRIPE_FL_TAX_RATE_ID=${rate.id}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
