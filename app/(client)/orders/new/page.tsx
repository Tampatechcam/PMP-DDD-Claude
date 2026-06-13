import Link from 'next/link'
import dynamic from 'next/dynamic'
import { OrderFormSkeleton } from '@/components/orders/OrderFormSkeleton'
import { listOfficesForCurrentClient } from '@/lib/db/offices'
import { listDistinctVenuesFromOrders } from '@/lib/db/orders'
import { getCurrentClientSelf } from '@/lib/db/clients'

const OrderForm = dynamic(
  () => import('@/components/orders/OrderForm').then((m) => ({ default: m.OrderForm })),
  { loading: () => <OrderFormSkeleton /> }
)

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
  const [client, offices, pastVenues] = await Promise.all([
    getCurrentClientSelf(),
    listOfficesForCurrentClient(),
    listDistinctVenuesFromOrders()
  ])

  const isGroup = offices.length > 1

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs">
          <Link href="/orders" className="text-muted hover:text-ink underline underline-offset-2">
            ← Orders
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">New order</h1>
        {client?.name && (
          <p className="text-sm text-muted">
            {client.name}
            {isGroup && (
              <span className="text-muted/70">
                {' · '}
                {offices.length} office{offices.length === 1 ? '' : 's'}
              </span>
            )}
          </p>
        )}
      </header>

      <OrderForm
        isGroup={isGroup}
        defaultOfficeId={searchParams.office ?? null}
        offices={offices.map((o) => ({
          id: o.id,
          name: o.name,
          advisor_names: o.advisor_names ?? null
        }))}
        pastVenues={pastVenues}
      />
    </section>
  )
}
