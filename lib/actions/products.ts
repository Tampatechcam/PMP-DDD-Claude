'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/db/auth'
import { createStripeProductWithPrice, createNewStripePrice, type ProductUnit } from '@/lib/stripe/products'

function s(form: FormData, name: string): string | null {
  const v = form.get(name)
  if (v == null) return null
  const t = String(v).trim()
  return t ? t : null
}
function num(form: FormData, name: string): number | null {
  const v = s(form, name)
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function bool(form: FormData, name: string): boolean {
  const v = form.get(name)
  return v === 'true' || v === 'on' || v === '1'
}

/** Add a catalog product. Creates a Stripe Product + Price (skipped for percent fees). */
export async function createProduct(form: FormData) {
  await requireAdmin()
  const supabase = createClient()
  const name = s(form, 'name')
  if (!name) throw new Error('Product name is required.')
  const category = s(form, 'category') || 'dm_mailer'
  const unit = (s(form, 'unit') ||
    (category === 'dm_mailer' ? 'per_piece' : category === 'fee' ? 'percent' : 'flat')) as ProductUnit
  const price = num(form, 'price') ?? 0

  let stripeProductId: string | null = null
  let stripePriceId: string | null = null
  if (unit !== 'percent') {
    const r = await createStripeProductWithPrice(name, price, unit)
    stripeProductId = r.stripeProductId
    stripePriceId = r.stripePriceId
  }

  const { error } = await supabase.from('products').insert({
    name, category, unit, price,
    stripe_product_id: stripeProductId,
    stripe_price_id: stripePriceId,
    sort: num(form, 'sort') ?? 0,
    notes: s(form, 'notes'),
  })
  if (error) throw error
  revalidatePath('/admin/pricing')
}

/**
 * Edit a product. A price change creates a NEW Stripe price (Stripe prices are
 * immutable), archives the old one to product_price_history, and points the row
 * at the new id. Name/active/sort/notes update in place.
 */
export async function updateProduct(form: FormData) {
  await requireAdmin()
  const supabase = createClient()
  const id = s(form, 'id')
  if (!id) throw new Error('Product id is required.')

  const { data: cur, error: e1 } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
  if (e1) throw e1
  if (!cur) throw new Error('Product not found.')

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (form.has('name')) patch.name = s(form, 'name')
  if (form.has('active')) patch.active = bool(form, 'active')
  if (form.has('notes')) patch.notes = s(form, 'notes')
  if (form.has('sort')) patch.sort = num(form, 'sort') ?? 0

  const newPrice = num(form, 'price')
  if (newPrice != null && Number(newPrice) !== Number((cur as { price: number }).price)) {
    patch.price = newPrice
    const c = cur as { unit: string; stripe_product_id: string | null; stripe_price_id: string | null; price: number }
    if (c.unit !== 'percent') {
      await supabase.from('product_price_history').insert({
        product_id: id, price: c.price, stripe_price_id: c.stripe_price_id,
      })
      const r = await createNewStripePrice({
        stripeProductId: c.stripe_product_id, oldPriceId: c.stripe_price_id, priceDollars: Number(newPrice),
      })
      patch.stripe_price_id = r.stripePriceId
      patch.stripe_product_id = r.stripeProductId
    }
  }

  const { error } = await supabase.from('products').update(patch).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/pricing')
}

/** Save a client's pricing defaults (mailer product, tech add-on, digital budget). */
export async function updateClientPricingDefaults(form: FormData) {
  await requireAdmin()
  const supabase = createClient()
  const clientId = s(form, 'client_id')
  if (!clientId) throw new Error('client_id is required.')
  const { error } = await supabase
    .from('clients')
    .update({
      default_mailer_product_id: s(form, 'default_mailer_product_id'),
      default_tech_product_id: s(form, 'default_tech_product_id'),
      default_digital_budget: num(form, 'default_digital_budget'),
    })
    .eq('id', clientId)
  if (error) throw error
  revalidatePath(`/admin/clients/${clientId}`)
}
