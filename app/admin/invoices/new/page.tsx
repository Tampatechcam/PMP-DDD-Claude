import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getOrderByRef } from '@/lib/db/orders'
import { adminGetClient } from '@/lib/db/clients'
import { getOfficeForOrderCard } from '@/lib/db/offices'
import { adminGetInvoiceForOrder } from '@/lib/db/invoices'
import { GenerateInvoiceForm } from '@/components/admin/GenerateInvoiceForm'
import { orderLabel } from '@/lib/utils/format'

interface Props {
  searchParams: { order?: string }
}

/**
 * /admin/invoices/new?order=<ref> — generate a Stripe invoice for one order.
 * If the order already has an invoice, bounce to it (one per order).
 */
export default async function NewInvoicePage({ searchParams }: Props) {
  const ref = searchParams.order
  if (!ref) notFound()

  const order = await getOrderByRef(ref)
  if (!order) notFound()

  const existing = await adminGetInvoiceForOrder(order.id)
  if (existing) redirect(`/admin/invoices/${existing.id}`)

  const [client, office] = await Promise.all([
    adminGetClient(order.client_id),
    order.office_id ? getOfficeForOrderCard(order.office_id) : Promise.resolve(null),
  ])

  const defaultRate = (client as { default_mailer_rate?: number | null } | null)
    ?.default_mailer_rate ?? null
  const defaultEmail = (client as { billing_email?: string | null } | null)
    ?.billing_email ?? null
  const orderRef = order.display_ref ?? String(order.order_number)

  return (
    <section className="space-y-5">
      <p className="text-xs">
        <Link
          href={`/admin/orders/${orderRef}`}
          className="text-muted hover:text-ink underline underline-offset-2"
        >
          ← Order {orderLabel(order)}
        </Link>
      </p>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Generate invoice</h1>
        <p className="text-sm text-muted">
          {(client as { name?: string } | null)?.name ?? 'Client'} · order {orderLabel(order)}
          {office?.state ? ` · ${office.state}` : ''}
        </p>
      </header>

      <GenerateInvoiceForm
        orderId={order.id}
        orderRef={orderRef}
        needsDM={order.needs_direct_mail}
        mailingQuantity={order.mailing_quantity}
        defaultRate={defaultRate}
        defaultDigital={order.digital_budget}
        officeState={office?.state ?? null}
        defaultEmail={defaultEmail}
      />
    </section>
  )
}
