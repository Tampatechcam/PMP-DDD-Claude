import Link from 'next/link'
import { adminListInvoices } from '@/lib/db/invoices'
import { formatMoney, formatEventDate, orderHref, orderLabel } from '@/lib/utils/format'

/**
 * /admin/invoices — admin-only (RLS owns the gate; the layout enforces
 * navigation). Clients never see this in v1 (ADR 0004 / Part 16).
 */
export default async function AdminInvoicesPage() {
  const invoices = await adminListInvoices()

  const totalSum = invoices.reduce(
    (sum, inv) => sum + (inv.total_invoice != null ? Number(inv.total_invoice) : 0),
    0
  )
  const paidCount = invoices.filter((i) => i.invoice_paid_date).length

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted">
          {invoices.length} total · {paidCount} paid ·{' '}
          {totalSum > 0 && <span>{formatMoney(totalSum)} invoiced</span>}
        </p>
      </header>

      {invoices.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center bg-surface">
          <p className="text-sm font-medium">No invoices yet</p>
          <p className="text-xs text-muted mt-1">
            Invoices appear here as orders move through billing.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted bg-bg">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 font-semibold">Order</th>
                <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold">Sent</th>
                <th className="text-left px-4 py-2.5 font-semibold">Paid</th>
                <th className="text-right px-4 py-2.5 font-semibold">DM</th>
                <th className="text-right px-4 py-2.5 font-semibold">Digital</th>
                <th className="text-right px-4 py-2.5 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-bg transition-colors">
                  <td className="px-4 py-2.5">
                    {inv.orders ? (
                      <Link
                        href={orderHref(inv.orders, '/admin/orders')}
                        className="font-medium underline underline-offset-2"
                      >
                        {orderLabel(inv.orders)}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <InvoiceStatus status={inv.status} paid={!!inv.invoice_paid_date} />
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {inv.invoice_sent_date ? formatEventDate(inv.invoice_sent_date) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {inv.invoice_paid_date ? formatEventDate(inv.invoice_paid_date) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {inv.invoiced_dm_total != null
                      ? formatMoney(Number(inv.invoiced_dm_total))
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {inv.invoiced_digital != null
                      ? formatMoney(Number(inv.invoiced_digital))
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {inv.total_invoice != null
                      ? formatMoney(Number(inv.total_invoice))
                      : '—'}
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
  const cls = paid
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : status.toLowerCase().includes('sent')
      ? 'bg-amber-50 text-amber-900 border-amber-200'
      : 'bg-stone-100 text-stone-700 border-stone-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${cls}`}>
      {status}
    </span>
  )
}
