import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'

/**
 * Admin home — a few counts and quick links. Deliberately minimal: this
 * isn't a reporting dashboard. The day-to-day work lives on /admin/orders.
 */
export default async function AdminHome() {
  const supabase = createClient()

  const [
    { count: clientsCount },
    { count: ordersCount },
    { count: pendingProofsCount }
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase
      .from('proofs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
  ])

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-xl font-medium">Admin</h1>
        <p className="text-sm text-muted">
          Overview. Day-to-day work lives in the nav above.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Tile href="/admin/clients" label="Clients" value={clientsCount ?? 0} />
        <Tile href="/admin/orders" label="Orders" value={ordersCount ?? 0} />
        <Tile
          href="/admin/orders"
          label="Proofs awaiting client"
          value={pendingProofsCount ?? 0}
          tone={pendingProofsCount && pendingProofsCount > 0 ? 'warning' : 'neutral'}
        />
      </div>
    </section>
  )
}

function Tile({
  href,
  label,
  value,
  tone = 'neutral'
}: {
  href: string
  label: string
  value: number
  tone?: 'neutral' | 'warning'
}) {
  return (
    <Link href={href} className="block">
      <Card className="hover:bg-bg">
        <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
        <p
          className={`mt-1 text-2xl font-medium ${
            tone === 'warning' ? 'text-warning' : 'text-ink'
          }`}
        >
          {value}
        </p>
      </Card>
    </Link>
  )
}
