import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { createClient } from '@/lib/supabase/server'

/**
 * Admin home. Three count tiles + a "needs your attention" row when
 * there are pending proofs. Deliberately not a reporting dashboard —
 * day-to-day work lives in the sidebar.
 */
export default async function AdminHome() {
  const supabase = createClient()

  const [
    { count: clientsCount },
    { count: ordersCount },
    { count: pendingProofsCount },
    { count: invoicesCount }
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase
      .from('proofs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('invoices').select('id', { count: 'exact', head: true })
  ])

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted">
          Quick counts across every client. Day-to-day work lives in the nav.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile href="/admin/clients" label="Clients" icon="clients" value={clientsCount ?? 0} />
        <Tile href="/admin/orders" label="Orders" icon="orders" value={ordersCount ?? 0} />
        <Tile
          href="/admin/orders"
          label="Proofs awaiting client"
          icon="document"
          value={pendingProofsCount ?? 0}
          tone={pendingProofsCount && pendingProofsCount > 0 ? 'warning' : 'neutral'}
        />
        <Tile href="/admin/invoices" label="Invoices" icon="invoices" value={invoicesCount ?? 0} />
      </div>
    </section>
  )
}

function Tile({
  href,
  label,
  value,
  icon,
  tone = 'neutral'
}: {
  href: string
  label: string
  value: number
  icon: IconName
  tone?: 'neutral' | 'warning'
}) {
  const valueTone = tone === 'warning' ? 'text-warning' : 'text-ink'
  return (
    <Link href={href} className="block group">
      <Card className="hover:bg-bg transition-colors h-full">
        <div className="flex items-center justify-between text-muted text-xs uppercase tracking-wider font-medium">
          <span>{label}</span>
          <Icon name={icon} className="w-4 h-4 opacity-70 group-hover:opacity-100" />
        </div>
        <p className={`mt-2 text-3xl font-semibold tracking-tight ${valueTone}`}>
          {value}
        </p>
      </Card>
    </Link>
  )
}
