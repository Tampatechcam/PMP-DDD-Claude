import Link from 'next/link'
import { OrdersList } from '@/components/orders/OrdersList'
import { OfficeSwitcher } from '@/components/layout/OfficeSwitcher'
import { Icon } from '@/components/ui/Icon'
import { listOrdersForClient } from '@/lib/db/orders'
import { listOfficesForCurrentClient } from '@/lib/db/offices'
import { getCurrentClientSelf } from '@/lib/db/clients'

interface Props {
  searchParams: { office?: string }
}

/**
 * Orders list. Sort comes from the SQL view (event_1_date desc). The
 * office filter lives in the URL so refresh and Back/Forward do the
 * right thing (Part 10).
 *
 * For single-office clients, the OfficeSwitcher returns null and the
 * UI stays uncluttered.
 */
export default async function OrdersListPage({ searchParams }: Props) {
  const activeOfficeId = searchParams.office ?? null

  const [client, offices, orders] = await Promise.all([
    getCurrentClientSelf(),
    listOfficesForCurrentClient(),
    listOrdersForClient(activeOfficeId ? { officeId: activeOfficeId } : undefined)
  ])

  const activeOffice = offices.find((o) => o.id === activeOfficeId)
  const summary = `${orders.length} order${orders.length === 1 ? '' : 's'}`

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted">
            {client?.name ? `${client.name} · ` : ''}
            {summary}
            {activeOffice && (
              <span className="text-muted/70"> · filtered to {activeOffice.name}</span>
            )}
          </p>
        </div>
        <Link
          href={
            activeOfficeId ? `/orders/new?office=${activeOfficeId}` : '/orders/new'
          }
          className="inline-flex items-center gap-1.5 rounded text-sm font-medium px-3 py-2 bg-accent text-white hover:opacity-90 transition-opacity"
        >
          <Icon name="plus" className="w-4 h-4" />
          New order
        </Link>
      </header>

      <OfficeSwitcher
        offices={offices.map((o) => ({ id: o.id, name: o.name }))}
        activeOfficeId={activeOfficeId}
        basePath="/orders"
      />

      <OrdersList orders={orders} />
    </section>
  )
}
