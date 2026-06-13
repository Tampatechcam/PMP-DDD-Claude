import 'server-only'
import { createClient } from '@/lib/supabase/server'

export type ProductCategory = 'dm_mailer' | 'digital' | 'tech' | 'fee'
export type ProductUnit = 'per_piece' | 'flat' | 'percent'

export type ProductRow = {
  id: string
  name: string
  category: ProductCategory
  unit: ProductUnit
  price: number
  stripe_product_id: string | null
  stripe_price_id: string | null
  active: boolean
  sort: number
  notes: string | null
  updated_at: string
}

/**
 * Products catalog reads. Admin-only at the RLS layer (products_admin_only).
 * `price` comes back from PostgREST as a string for numeric columns — callers
 * that do math should wrap in Number().
 */
export async function listProducts(opts?: { activeOnly?: boolean }): Promise<ProductRow[]> {
  const supabase = createClient()
  let q = supabase.from('products').select('*').order('category').order('sort')
  if (opts?.activeOnly) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as ProductRow[]
}

/** Active products in one category, for the client-default + invoice dropdowns. */
export async function listActiveByCategory(category: ProductCategory): Promise<ProductRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .eq('active', true)
    .order('sort')
  if (error) throw error
  return (data ?? []) as unknown as ProductRow[]
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data ?? null) as unknown as ProductRow | null
}
