import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { OrdersList, type OrdersTab } from '@/components/orders/OrdersList'
import { createClient } from '@/lib/supabase/server'
import { adminListOrders } from '@/lib/db/orders'
import { adminListClients } from '@/lib/db/clients'

interface Props {
  searchParams: { tab?: string }
}

/**
 * Admin Overview. Four count tiles + the tabbed Upcoming/Past Events
 * orders table. The tab choice lives in ?tab=past so the sidebar's
 * "Past events" item can deep-link straight to the past view.
 */
export default async function AdminHome({ searchParams }: Props) {
  const activeTab: OrdersTab = searchParams.tab === 'past' ? 'past' : 'upcoming'

  const supabase = createClient()
  const [
    { count: clientsCount },
    { count: ordersCount },
    { count: pendingProofsCount },
    { count: invoicesCount },
    orders,
    clients
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase
      .from('proofs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('invoices').select('id', { count: 'exact', head: true }),
    adminListOrders({ limit: 500 }),
    adminListClients()
  ])

  const clientNameById = Object.fromEntries(clients.map((c) => [c.id, c.name]))

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted">
          Tabs below — Upcoming is what ops works on; Past events is the
          historical archive (also pinned in the sidebar).
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

      <OrdersList
        orders={orders}
        activeTab={activeTab}
        basePath="/admin"
        showClient
        clientNameById={clientNameById}
      />
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
