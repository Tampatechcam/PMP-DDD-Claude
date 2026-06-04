import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Pill, type PillTone } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { getInvoiceForClient } from '@/lib/db/invoices'
import { formatMoney, formatEventDate, orderLabel } from '@/lib/utils/format'

interface Props {
  params: { id: string }
}

/**
 * /invoices/[id] — read-only invoice breakdown for the client, with Pay
 * (Stripe hosted page) + Download PDF. RLS scopes the read to the client's
 * own orders; a stranger's id 404s.
 */
export default async function ClientInvoiceDetailPage({ params }: Props) {
  const inv = await getInvoiceForClient(params.id)
  if (!inv) notFound()

  const paid = !!inv.invoice_paid_date
  const payable = !paid && inv.status !== 'Void' && !!inv.hosted_invoice_url

  return (
    <section className="space-y-5 max-w-2xl">
      <p className="text-xs">
        <Link href="/invoices" className="text-muted hover:text-ink underline underline-offset-2">
          ← Invoices
        </Link>
      </p>

      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-medium">
            Invoice
            {inv.orders && <span className="text-muted font-normal"> · order {orderLabel(inv.orders)}</span>}
          </h1>
          <p className="text-sm text-muted">
            {inv.invoice_sent_date ? `Sent ${formatEventDate(inv.invoice_sent_date)}` : `Created ${formatEventDate(inv.created_at)}`}
          </p>
        </div>
        <InvoiceStatus status={inv.status} paid={paid} />
      </header>

      <Card>
        <h2 className="text-sm font-medium mb-3">Line items</h2>
        <Dl>
          <Dt>Direct mail</Dt>
          <Dd>{inv.invoiced_dm_total != null ? formatMoney(Number(inv.invoiced_dm_total)) : null}</Dd>
          <Dt>Digital</Dt>
          <Dd>{inv.invoiced_digital != null ? formatMoney(Number(inv.invoiced_digital)) : null}</Dd>
          <Dt>Tech / sequences</Dt>
          <Dd>{inv.invoiced_tech != null ? formatMoney(Number(inv.invoiced_tech)) : null}</Dd>
          <Dt>Card processing (3%)</Dt>
          <Dd>{inv.cc_processing != null ? formatMoney(Number(inv.cc_processing)) : null}</Dd>
          <Dt>Sales tax</Dt>
          <Dd>{inv.fl_state_tax != null ? formatMoney(Number(inv.fl_state_tax)) : null}</Dd>
        </Dl>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium">Total</h2>
            <p className="text-2xl font-semibold tracking-tight mt-1">
              {inv.total_invoice != null ? formatMoney(Number(inv.total_invoice)) : '—'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {payable && (
              <Button href={inv.hosted_invoice_url!} target="_blank">
                Pay invoice
              </Button>
            )}
            {inv.invoice_pdf_url && (
              <Button href={inv.invoice_pdf_url} variant="secondary" size="sm" target="_blank">
                Download PDF
              </Button>
            )}
          </div>
        </div>
        {paid && inv.invoice_paid_date && (
          <p className="text-xs text-success mt-3">
            Paid {formatEventDate(inv.invoice_paid_date)}
          </p>
        )}
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
  return <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">{children}</dl>
}
function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="text-xs text-muted">{children}</dt>
}
function Dd({ children }: { children: React.ReactNode }) {
  return <dd className="text-sm">{children ?? <span className="text-muted">—</span>}</dd>
}
