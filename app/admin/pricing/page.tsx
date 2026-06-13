import { listProducts } from '@/lib/db/products'
import { PricingSheet } from '@/components/admin/PricingSheet'

/**
 * /admin/pricing — the editable product catalog ("pricing sheet"). Admin-only
 * (RLS owns the gate). Each product mirrors a Stripe Product + Price;
 * generateInvoice pushes these `price_id`s so invoices tie to real Stripe
 * products. Editing a price creates a new Stripe price (they're immutable) and
 * archives the old one to product_price_history.
 */
export default async function AdminPricingPage() {
  const products = await listProducts()

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
        <p className="text-sm text-muted">
          Product catalog used to auto-build invoices. Changing a price creates a new
          Stripe price and keeps the old one in history.
        </p>
      </header>
      <PricingSheet products={products} />
    </section>
  )
}
