'use client'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { createProduct, updateProduct } from '@/lib/actions/products'
import type { ProductRow, ProductCategory } from '@/lib/db/products'

const GROUPS: { key: ProductCategory; label: string; unit: string }[] = [
  { key: 'dm_mailer', label: 'Direct-mail mailers', unit: 'per_piece' },
  { key: 'digital', label: 'Digital', unit: 'flat' },
  { key: 'tech', label: 'Tech / sequences', unit: 'flat' },
  { key: 'fee', label: 'Fees & tax', unit: 'percent' },
]

const input =
  'rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent'

function priceStep(unit: string) {
  return unit === 'per_piece' ? '0.001' : unit === 'percent' ? '0.1' : '1'
}

/**
 * The editable pricing sheet. Every product is its own <form> posting
 * updateProduct (name/price/active), plus an "Add product" form per group.
 * Changing a price spins up a new Stripe price server-side (Stripe prices are
 * immutable) — the read-only Stripe id column reflects the current one.
 */
export function PricingSheet({ products }: { products: ProductRow[] }) {
  return (
    <div className="space-y-8">
      {GROUPS.map((g) => {
        const rows = products.filter((p) => p.category === g.key)
        return (
          <section key={g.key} className="space-y-2">
            <h2 className="text-sm font-semibold">{g.label}</h2>
            <div className="border border-border rounded-lg bg-surface overflow-hidden">
              <div className="grid grid-cols-[1fr_7rem_6rem_8rem_5rem] gap-2 px-3 py-2 label bg-bg border-b border-border">
                <span>Product</span>
                <span className="text-right">{g.unit === 'per_piece' ? '$/piece' : g.unit === 'percent' ? 'Percent' : 'Price'}</span>
                <span>Status</span>
                <span>Stripe price</span>
                <span></span>
              </div>
              {rows.map((p) => (
                <form
                  key={p.id}
                  action={updateProduct}
                  className="grid grid-cols-[1fr_7rem_6rem_8rem_5rem] gap-2 px-3 py-2 items-center border-b border-border last:border-0"
                >
                  <input type="hidden" name="id" value={p.id} />
                  <input name="name" defaultValue={p.name} className={input} />
                  <div className="relative">
                    {p.unit !== 'percent' && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>
                    )}
                    <input
                      name="price"
                      type="number"
                      step={priceStep(p.unit)}
                      min="0"
                      defaultValue={Number(p.price)}
                      className={`${input} w-full text-right tabular-nums ${p.unit !== 'percent' ? 'pl-5' : ''}`}
                    />
                  </div>
                  <select name="active" defaultValue={String(p.active)} className={input}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  <span className="text-[10px] text-muted font-mono truncate" title={p.stripe_price_id ?? ''}>
                    {p.stripe_price_id ? p.stripe_price_id.slice(0, 14) + '…' : p.unit === 'percent' ? 'computed' : '—'}
                  </span>
                  <SaveButton />
                </form>
              ))}
            </div>
            <AddProduct category={g.key} unit={g.unit} />
          </section>
        )
      })}
    </div>
  )
}

function AddProduct({ category, unit }: { category: ProductCategory; unit: string }) {
  return (
    <form action={createProduct} className="flex flex-wrap items-center gap-2 pt-1">
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="unit" value={unit} />
      <input name="name" placeholder="New product name" className={`${input} flex-1 min-w-[12rem]`} required />
      <div className="relative">
        {unit !== 'percent' && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>}
        <input name="price" type="number" step={priceStep(unit)} min="0" placeholder="0" className={`${input} w-28 text-right ${unit !== 'percent' ? 'pl-5' : ''}`} required />
      </div>
      <AddButton />
    </form>
  )
}

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="secondary" disabled={pending} className="px-2 py-1 text-xs">
      {pending ? '…' : 'Save'}
    </Button>
  )
}
function AddButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="px-3 py-1.5 text-xs">
      {pending ? 'Adding…' : 'Add product'}
    </Button>
  )
}
