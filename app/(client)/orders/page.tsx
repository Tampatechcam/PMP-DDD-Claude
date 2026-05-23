import { OrdersList } from '@/components/orders/OrdersList'
import { OfficeSwitcher } from '@/components/layout/OfficeSwitcher'
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

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Your orders</h1>
          {client?.name && <p className="text-sm text-muted">{client.name}</p>}
        </div>
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
