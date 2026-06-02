import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrderCard } from '@/components/orders/OrderCard'
import { ClientInfoCard } from '@/components/orders/ClientInfoCard'
import { getOrderByRefForClient, listEventsForOrder } from '@/lib/db/orders'
import { listProofsForOrder } from '@/lib/db/proofs'
import { getCurrentClientSelf } from '@/lib/db/clients'
import { getOfficeForOrderCard } from '@/lib/db/offices'
import { LiveRefresh } from '@/components/realtime/LiveRefresh'

interface Props {
  params: { order_number: string }
}

/**
 * Order detail. Route, not modal — deep-linkable, refresh-safe (Part 8).
 * The page is a Server Component so the browser ships zero JS for it.
 * Proof actions are a small Client island.
 */
export default async function OrderDetailPage({ params }: Props) {
  // Accepts an integer (DM orders) or "DIG-NNN" (digital-only).
  const order = await getOrderByRefForClient(params.order_number)
  if (!order) notFound()

  const [proofs, events, client, office] = await Promise.all([
    listProofsForOrder(order.id),
    listEventsForOrder(order.id),
    getCurrentClientSelf(),
    order.office_id ? getOfficeForOrderCard(order.office_id) : null
  ])

  return (
    <div className="space-y-4">
      <LiveRefresh filter={`order_id=eq.${order.id}`} tables={['proofs']} />
      <LiveRefresh filter={`id=eq.${order.id}`} tables={['orders']} />
      <p className="text-xs">
        <Link href="/orders" className="text-muted hover:text-ink underline underline-offset-2">
          ← Orders
        </Link>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6">
        <OrderCard order={order} proofs={proofs} events={events} />
        {client && (
          <ClientInfoCard
            client={client}
            office={office ?? null}
          />
        )}
      </div>
    </div>
  )
}
