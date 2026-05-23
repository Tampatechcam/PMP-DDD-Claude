import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrderCard } from '@/components/orders/OrderCard'
import { getOrderByNumber, listEventsForOrder } from '@/lib/db/orders'
import { listProofsForOrder } from '@/lib/db/proofs'

interface Props {
  params: { order_number: string }
}

/**
 * Order detail. Route, not modal — deep-linkable, refresh-safe (Part 8).
 * Three queries in parallel; the page is a Server Component so the
 * browser ships zero JS for it. Proof actions are a small Client island.
 */
export default async function OrderDetailPage({ params }: Props) {
  const n = Number(params.order_number)
  if (!Number.isInteger(n) || n <= 0) notFound()

  const order = await getOrderByNumber(n)
  if (!order) notFound()

  const [proofs, events] = await Promise.all([
    listProofsForOrder(order.id),
    listEventsForOrder(order.id)
  ])

  return (
    <div className="space-y-4">
      <p className="text-xs">
        <Link href="/orders" className="text-muted hover:text-ink underline underline-offset-2">
          ← Orders
        </Link>
      </p>
      <OrderCard order={order} proofs={proofs} events={events} />
    </div>
  )
}
