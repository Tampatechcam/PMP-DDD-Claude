import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrderCard } from '@/components/orders/OrderCard'
import { ClientInfoCard } from '@/components/orders/ClientInfoCard'
import { getOrderByNumber, listEventsForOrder } from '@/lib/db/orders'
import { listProofsForOrder } from '@/lib/db/proofs'
import { getCurrentClientSelf } from '@/lib/db/clients'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: { order_number: string }
}

/**
 * Order detail. Route, not modal — deep-linkable, refresh-safe (Part 8).
 * The page is a Server Component so the browser ships zero JS for it.
 * Proof actions are a small Client island.
 */
export default async function OrderDetailPage({ params }: Props) {
  const n = Number(params.order_number)
  if (!Number.isInteger(n) || n <= 0) notFound()

  const order = await getOrderByNumber(n)
  if (!order) notFound()

  const supabase = createClient()
  const [proofs, events, client, officeRes] = await Promise.all([
    listProofsForOrder(order.id),
    listEventsForOrder(order.id),
    getCurrentClientSelf(),
    order.office_id
      ? supabase
          .from('offices')
          .select('name, registration_phone, registration_url_direct, registration_url_digital, advisor_names')
          .eq('id', order.office_id)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ])

  return (
    <div className="space-y-4">
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
            office={officeRes?.data ?? null}
          />
        )}
      </div>
    </div>
  )
}
