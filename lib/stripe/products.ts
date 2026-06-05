import 'server-only'
import { getStripe } from './server'
import { toCents } from '@/lib/invoices/compute'

export type ProductUnit = 'per_piece' | 'flat' | 'percent'

/**
 * Create a Stripe Product + Price for a new catalog row. `priceDollars` is the
 * per-piece rate (per_piece) or flat dollar amount (flat). `percent` products
 * (fees/tax) are computed, not priced in Stripe — they get no price.
 */
export async function createStripeProductWithPrice(
  name: string,
  priceDollars: number,
  unit: ProductUnit
): Promise<{ stripeProductId: string; stripePriceId: string | null }> {
  const stripe = getStripe()
  const product = await stripe.products.create({ name })
  if (unit === 'percent') return { stripeProductId: product.id, stripePriceId: null }
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: toCents(priceDollars),
  })
  return { stripeProductId: product.id, stripePriceId: price.id }
}

/**
 * Stripe prices are immutable, so changing an amount means creating a NEW price
 * under the same product and archiving the old one. Returns the new price id.
 * If we don't yet know the product id (seeded rows store only the price id),
 * resolve it from the old price first.
 */
export async function createNewStripePrice(
  opts: { stripeProductId: string | null; oldPriceId: string | null; priceDollars: number }
): Promise<{ stripePriceId: string; stripeProductId: string }> {
  const stripe = getStripe()
  let productId = opts.stripeProductId
  if (!productId && opts.oldPriceId) {
    const old = await stripe.prices.retrieve(opts.oldPriceId)
    productId = typeof old.product === 'string' ? old.product : old.product.id
  }
  if (!productId) throw new Error('Cannot create a Stripe price without a product id.')
  const price = await stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: toCents(opts.priceDollars),
  })
  if (opts.oldPriceId) {
    try {
      await stripe.prices.update(opts.oldPriceId, { active: false })
    } catch {
      /* archiving the old price is best-effort */
    }
  }
  return { stripePriceId: price.id, stripeProductId: productId }
}
