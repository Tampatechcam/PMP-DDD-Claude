import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrderCard } from '@/components/orders/OrderCard'
import { getOrderByNumber, listEventsForOrder } from '@/lib/db/orders'
import { listProofsForOrder } from '@/lib/db/proofs'
import { adminGetClient } from '@/lib/db/clients'

interface Props {
  params: { order_number: string }
}

/**
 * Admin order detail. Same Part 8 layout as the client view, with the
 * admin-only Upload-proof affordance plus a back-link to the client.
 *
 * Client read uses the base table (RLS still applies; admin policy lets
 * us see all rows).
 */
export default async function AdminOrderDetailPage({ params }: Props) {
  const n = Number(params.order_number)
  if (!Number.isInteger(n) || n <= 0) notFound()

  const order = await getOrderByNumber(n)
  if (!order) notFound()

  const [proofs, events, client] = await Promise.all([
    listProofsForOrder(order.id),
    listEventsForOrder(order.id),
    adminGetClient(order.client_id)
  ])

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <Link
            href={`/admin/clients/${order.client_id}`}
            className="underline underline-offset-2"
          >
            {client?.name ?? 'Client'}
          </Link>
        </p>
        <Link
          href={`/admin/proofs/${order.id}/upload`}
          className="inline-flex items-center justify-center rounded text-sm font-medium px-3 py-2 bg-accent text-white hover:opacity-90"
        >
          Upload proof
        </Link>
      </div>

      <OrderCard order={order} proofs={proofs} events={events} />
    </section>
  )
}
