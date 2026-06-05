import Link from 'next/link'
import { listInvoicesForClient } from '@/lib/db/invoices'
import { formatMoney, formatEventDate, orderLabel } from '@/lib/utils/format'
import { Pill, type PillTone } from '@/components/ui/Pill'
import { EmptyState } from '@/components/ui/EmptyState'

/**
 * /invoices — the client's own invoices (RLS-scoped). Read-only: clients pay
 * via the Stripe hosted page linked from each invoice. See ADR 0008.
 */
export default async function ClientInvoicesPage() {
  const invoices = await listInvoicesForClient()
  const outstanding = invoices.filter((i) => !i.invoice_paid_date && i.status !== 'Void')

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted">
          {invoices.length === 0
            ? 'Your invoices will appear here.'
            : `${invoices.length} total · ${outstanding.length} outstanding`}
        </p>
      </header>

      {invoices.length === 0 ? (
        <EmptyState
          icon="invoices"
          title="No invoices yet"
          description="Invoices appear here once your orders are billed."
        />
      ) : (
        <div className="border border-border rounded-lg bg-surface">
          <table className="w-full text-sm">
            <thead className="label bg-bg">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 font-semibold">Order</th>
                <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold">Sent</th>
                <th className="text-right px-4 py-2.5 font-semibold">Total</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-bg transition-colors">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium underline underline-offset-2"
                    >
                      {inv.orders ? orderLabel(inv.orders) : 'Invoice'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <InvoiceStatus status={inv.status} paid={!!inv.invoice_paid_date} />
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {inv.invoice_sent_date ? formatEventDate(inv.invoice_sent_date) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {inv.total_invoice != null ? formatMoney(Number(inv.total_invoice)) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!inv.invoice_paid_date && inv.status !== 'Void' && inv.hosted_invoice_url && (
                      <a
                        href={inv.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent underline underline-offset-2 text-xs font-medium"
                      >
                        Pay now
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
