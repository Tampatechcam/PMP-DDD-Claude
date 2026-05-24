import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Pill, type PillTone } from '@/components/ui/Pill'
import { adminGetInvoice } from '@/lib/db/invoices'
import { formatMoney, formatEventDate, orderHref, orderLabel } from '@/lib/utils/format'

interface Props {
  params: { id: string }
}

/**
 * /admin/invoices/[id] — full breakdown for one invoice. Surfaces every
 * column from Part 4.1 that the list view (`/admin/invoices`) summarizes
 * to the row's totals only: line items (DM rate × total, digital, tech),
 * fees (CC processing, FL state tax), status, and the linked order.
 */
export default async function AdminInvoiceDetailPage({ params }: Props) {
  const inv = await adminGetInvoice(params.id)
  if (!inv) notFound()

  const paid = !!inv.invoice_paid_date

  return (
    <section className="space-y-5 max-w-2xl">
      <p className="text-xs">
        <Link
          href="/admin/invoices"
          className="text-muted hover:text-ink underline underline-offset-2"
        >
          ← Invoices
        </Link>
      </p>

      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-medium">
            Invoice
            {inv.orders && (
              <span className="text-muted font-normal"> · order </span>
            )}
            {inv.orders && (
              <Link
                href={orderHref(inv.orders, '/admin/orders')}
                className="underline underline-offset-2 font-normal"
              >
                {orderLabel(inv.orders)}
              </Link>
            )}
          </h1>
          <p className="text-sm text-muted">
            Created {formatEventDate(inv.created_at)}
          </p>
        </div>
        <InvoiceStatus status={inv.status} paid={paid} />
      </header>

      <Card>
        <h2 className="text-sm font-medium mb-3">Dates</h2>
        <Dl>
          <Dt>Sent</Dt>
          <Dd>{inv.invoice_sent_date ? formatEventDate(inv.invoice_sent_date) : null}</Dd>
          <Dt>Paid</Dt>
          <Dd>{inv.invoice_paid_date ? formatEventDate(inv.invoice_paid_date) : null}</Dd>
        </Dl>
      </Card>

      <Card>
        <h2 className="text-sm font-medium mb-3">Line items</h2>
        <Dl>
          <Dt>Direct mail rate</Dt>
          <Dd>{inv.invoiced_dm_rate != null ? `$${inv.invoiced_dm_rate}` : null}</Dd>
          <Dt>Direct mail total</Dt>
          <Dd>{inv.invoiced_dm_total != null ? formatMoney(Number(inv.invoiced_dm_total)) : null}</Dd>
          <Dt>Digital</Dt>
          <Dd>{inv.invoiced_digital != null ? formatMoney(Number(inv.invoiced_digital)) : null}</Dd>
          <Dt>Tech / sequences</Dt>
          <Dd>{inv.invoiced_tech != null ? formatMoney(Number(inv.invoiced_tech)) : null}</Dd>
        </Dl>
      </Card>

      <Card>
        <h2 className="text-sm font-medium mb-3">Fees</h2>
        <Dl>
          <Dt>CC processing</Dt>
          <Dd>{inv.cc_processing != null ? formatMoney(Number(inv.cc_processing)) : null}</Dd>
          <Dt>FL state tax</Dt>
          <Dd>{inv.fl_state_tax != null ? formatMoney(Number(inv.fl_state_tax)) : null}</Dd>
        </Dl>
      </Card>

      <Card>
        <h2 className="text-sm font-medium mb-3">Total</h2>
        <p className="text-2xl font-semibold tracking-tight">
          {inv.total_invoice != null ? formatMoney(Number(inv.total_invoice)) : '—'}
        </p>
      </Card>
    </section>
  )
}

function InvoiceStatus({ status, paid }: { status: string; paid: boolean }) {
  const tone: PillTone = paid
    ? 'success'
    : status.toLowerCase().includes('sent')
      ? 'warning'
      : 'neutral'
  return <Pill tone={tone}>{status}</Pill>
}

function Dl({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {children}
    </dl>
  )
}
function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="text-xs text-muted">{children}</dt>
}
function Dd({ children }: { children: React.ReactNode }) {
  return <dd className="text-sm">{children ?? <span className="text-muted">—</span>}</dd>
}
