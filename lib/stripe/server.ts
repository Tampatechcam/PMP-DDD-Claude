import 'server-only'
import Stripe from 'stripe'

/**
 * Server-side Stripe client. Test keys in dev, live keys at deploy.
 *
 * The feature stays dormant until STRIPE_SECRET_KEY is set — getStripe()
 * throws a clear error rather than constructing a broken client, mirroring
 * how the Sheet sync no-ops without DM_SHEET_CSV_URL. Never import this from
 * a Client Component (the `server-only` guard fails the build if you do).
 *
 * apiVersion is intentionally omitted so the installed SDK's pinned version
 * is used — avoids a literal-type mismatch on every SDK bump.
 */

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set — invoicing is disabled. Add a test key ' +
        'to .env.local (see .env.example).'
    )
  }
  _stripe = new Stripe(key)
  return _stripe
}

/** Whether Stripe is wired up — lets UI degrade gracefully when it isn't. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/**
 * The Stripe TaxRate id for Florida sales tax (7%), created once by
 * scripts/stripe-setup.ts. Null when unset — generateInvoice then skips tax
 * (and logs), rather than charging an untaxed FL client silently.
 */
export function flTaxRateId(): string | null {
  return process.env.STRIPE_FL_TAX_RATE_ID || null
}
