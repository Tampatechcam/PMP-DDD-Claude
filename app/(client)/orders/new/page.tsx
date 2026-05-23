import { OrderForm } from '@/components/orders/OrderForm'
import { listOfficesForCurrentClient } from '@/lib/db/offices'
import { listVenuesForCurrentClient } from '@/lib/db/venues'
import { getCurrentClientSelf } from '@/lib/db/clients'

interface Props {
  searchParams: { office?: string }
}

/**
 * /orders/new — Part 7 spec.
 *
 * The form is a Client Component (it needs the DM/Digital toggle, the
 * cascading venue picker, and the "+ Add another event" state). We fetch
 * the data it needs on the server and hand it down as props so the
 * client component stays focused on UI state.
 */
export default async function NewOrderPage({ searchParams }: Props) {
  const [client, offices, venues] = await Promise.all([
    getCurrentClientSelf(),
    listOfficesForCurrentClient(),
    listVenuesForCurrentClient()
  ])

  const isGroup = offices.length > 1

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-medium">New order</h1>
        {client?.name && <p className="text-sm text-muted">{client.name}</p>}
      </header>

      <OrderForm
        isGroup={isGroup}
        defaultOfficeId={searchParams.office ?? null}
        offices={offices.map((o) => ({
          id: o.id,
          name: o.name,
          advisor_names: o.advisor_names ?? null
        }))}
        venues={venues.map((v) => ({
          id: v.id,
          name: v.name,
          buildings: v.buildings.map((b) => ({
            id: b.id,
            name: b.name,
            rooms: b.rooms.map((r) => ({
              id: r.id,
              name: r.name,
              capacity: r.capacity
            }))
          }))
        }))}
      />
    </section>
  )
}
