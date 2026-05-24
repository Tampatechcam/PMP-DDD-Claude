import Link from 'next/link'
import { OrdersList, type OrdersTab } from '@/components/orders/OrdersList'
import { OfficeSwitcher } from '@/components/layout/OfficeSwitcher'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { listOrdersForClient } from '@/lib/db/orders'
import { listOfficesForCurrentClient } from '@/lib/db/offices'
import { getCurrentClientSelf } from '@/lib/db/clients'

interface Props {
  searchParams: { office?: string; tab?: string }
}

export default async function OrdersListPage({ searchParams }: Props) {
  const activeOfficeId = searchParams.office ?? null
  const activeTab: OrdersTab = searchParams.tab === 'past' ? 'past' : 'upcoming'

  const [client, offices, orders] = await Promise.all([
    getCurrentClientSelf(),
    listOfficesForCurrentClient(),
    listOrdersForClient(activeOfficeId ? { officeId: activeOfficeId } : undefined)
  ])

  const activeOffice = offices.find((o) => o.id === activeOfficeId)

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted">
            {client?.name ? `${client.name} · ` : ''}
            {orders.length} total
            {activeOffice && (
              <span className="text-muted/70"> · filtered to {activeOffice.name}</span>
            )}
          </p>
        </div>
        <Button
          href={
            activeOfficeId ? `/orders/new?office=${activeOfficeId}` : '/orders/new'
          }
          className="gap-1.5"
        >
          <Icon name="plus" className="w-4 h-4" />
          New order
        </Button>
      </header>

      <OfficeSwitcher
        offices={offices.map((o) => ({ id: o.id, name: o.name }))}
        activeOfficeId={activeOfficeId}
        basePath="/orders"
      />

      <OrdersList
        orders={orders}
        activeTab={activeTab}
        basePath="/orders"
        preserveParams={{ office: activeOfficeId ?? undefined }}
      />
    </section>
  )
}
