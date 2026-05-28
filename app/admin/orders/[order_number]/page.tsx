import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrderCard } from '@/components/orders/OrderCard'
import { ClientInfoCard } from '@/components/orders/ClientInfoCard'
import { getOrderByRef, listEventsForOrder } from '@/lib/db/orders'
import { listProofsForOrder } from '@/lib/db/proofs'
import { adminGetClient } from '@/lib/db/clients'
import { getOfficeForOrderCard } from '@/lib/db/offices'
import { Button } from '@/components/ui/Button'
import { OrderStatusEditor } from '@/components/admin/OrderStatusEditor'

interface Props {
  params: { order_number: string }
}

/**
 * Admin order detail. Same Part 8 OrderCard plus the static Client Dictionary
 * info on the side. Internal pricing/responsibility fields are shown here
 * (the client-side equivalent at /orders/[n] hides them via client_self_view).
 */
export default async function AdminOrderDetailPage({ params }: Props) {
  // The dynamic segment is named order_number for legacy reasons but now
  // accepts either an integer (DM orders) or "DIG-NNN" (digital-only).
  const order = await getOrderByRef(params.order_number)
  if (!order) notFound()

  const [proofs, events, client, office] = await Promise.all([
    listProofsForOrder(order.id),
    listEventsForOrder(order.id),
    adminGetClient(order.client_id),
    order.office_id ? getOfficeForOrderCard(order.office_id) : null
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
        <Button href={`/admin/proofs/${order.id}/upload`}>Upload proof</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_24rem] gap-6">
        <OrderCard order={order} proofs={proofs} events={events} />
        <div className="space-y-6">
          <OrderStatusEditor
            orderId={order.id}
            refSlug={order.display_ref ?? String(order.order_number)}
            needsDM={order.needs_direct_mail}
            needsDigital={order.needs_digital}
            dmStatus={order.dm_status}
            digitalStatus={order.digital_status}
          />
          {client && (
            <ClientInfoCard
              client={client}
              office={office ?? null}
              admin
            />
          )}
        </div>
      </div>
    </section>
  )
}
