import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { ProofUploadForm } from '@/components/proofs/ProofUploadForm'
import { getOrderById } from '@/lib/db/orders'
import { orderHref, orderLabel } from '@/lib/utils/format'

interface Props {
  // [id] is the order_id (uuid). We use it rather than order_number so the
  // upload URL is opaque — no need to leak sequential numbering to anyone
  // the admin shares the link with by accident.
  params: { id: string }
}

export default async function AdminProofUploadPage({ params }: Props) {
  const order = await getOrderById(params.id)
  if (!order) notFound()

  return (
    <section className="space-y-5 max-w-xl">
      <header className="space-y-1">
        <h1 className="text-xl font-medium">Upload proof</h1>
        <p className="text-sm text-muted">
          Order {orderLabel(order)}
          {order.class_type && ` · ${order.class_type}`}
          {order.advisor_name && ` · ${order.advisor_name}`}
        </p>
      </header>

      <Card>
        <ProofUploadForm orderId={order.id} orderLabel={orderLabel(order)} />
      </Card>

      <p className="text-xs text-muted">
        <Link
          href={orderHref(order, '/admin/orders')}
          className="underline underline-offset-2"
        >
          ← Back to order
        </Link>
      </p>
    </section>
  )
}
