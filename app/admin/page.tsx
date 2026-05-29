import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { OrdersList, type OrdersTab } from '@/components/orders/OrdersList'
import { AdminAttention } from '@/components/admin/AdminAttention'
import { adminListOrders } from '@/lib/db/orders'
import { adminListClients } from '@/lib/db/clients'
import { adminCounts } from '@/lib/db/dashboards'

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

  const [counts, orders, clients] = await Promise.all([
    adminCounts(),
    adminListOrders({ limit: 500 }),
    adminListClients()
  ])

  const clientNameById = Object.fromEntries(clients.map((c) => [c.id, c.name]))

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted">
          What needs attention is up top; Upcoming is the working list,
          and Past events is the historical archive.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          href="/admin/clients"
          label="Clients"
          icon="clients"
          value={counts.clients}
        />
        <Tile
          href="/admin/orders"
          label="Orders"
          icon="orders"
          value={counts.orders}
          hint="DM jobs only"
        />
        <Tile
          href="/admin/orders?status=Awaiting+Your+Approval"
          label="Proofs with clients"
          icon="document"
          value={counts.pendingProofs}
          tone={counts.pendingProofs > 0 ? 'warning' : 'neutral'}
          hint={counts.pendingProofs > 0 ? 'Review queue' : 'Inbox zero'}
        />
        <Tile
          href="/admin/invoices"
          label="Invoices"
          icon="invoices"
          value={counts.invoices}
        />
      </div>

      {activeTab === 'upcoming' && (
        <AdminAttention orders={orders} clientNameById={clientNameById} />
      )}

      <OrdersList
        orders={orders}
        activeTab={activeTab}
        basePath="/admin"
        ordersBasePath="/admin/orders"
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
  tone = 'neutral',
  hint
}: {
  href: string
  label: string
  value: number
  icon: IconName
  tone?: 'neutral' | 'warning'
  hint?: string
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
        {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
      </Card>
    </Link>
  )
}
