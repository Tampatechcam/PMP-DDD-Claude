import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrderCard } from '@/components/orders/OrderCard'
import { ClientInfoCard } from '@/components/orders/ClientInfoCard'
import { getOrderByNumber, listEventsForOrder } from '@/lib/db/orders'
import { listProofsForOrder } from '@/lib/db/proofs'
import { adminGetClient } from '@/lib/db/clients'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: { order_number: string }
}

/**
 * Admin order detail. Same Part 8 OrderCard plus the static Client Dictionary
 * info on the side. Internal pricing/responsibility fields are shown here
 * (the client-side equivalent at /orders/[n] hides them via client_self_view).
 */
export default async function AdminOrderDetailPage({ params }: Props) {
  const n = Number(params.order_number)
  if (!Number.isInteger(n) || n <= 0) notFound()

  const order = await getOrderByNumber(n)
  if (!order) notFound()

  const supabase = createClient()
  const [proofs, events, client, officeRes] = await Promise.all([
    listProofsForOrder(order.id),
    listEventsForOrder(order.id),
    adminGetClient(order.client_id),
    order.office_id
      ? supabase
          .from('offices')
          .select('name, registration_phone, registration_url_direct, registration_url_digital, advisor_names')
          .eq('id', order.office_id)
          .maybeSingle()
      : Promise.resolve({ data: null })
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_24rem] gap-6">
        <OrderCard order={order} proofs={proofs} events={events} />
        {client && (
          <ClientInfoCard
            client={client}
            office={officeRes?.data ?? null}
            admin
          />
        )}
      </div>
    </section>
  )
}
