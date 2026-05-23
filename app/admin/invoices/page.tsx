import Link from 'next/link'
import { adminListInvoices } from '@/lib/db/invoices'
import { formatMoney, formatEventDate } from '@/lib/utils/format'

/**
 * /admin/invoices — admin-only (RLS owns the gate; the layout enforces
 * navigation). Clients never see this in v1 (ADR 0004 / Part 16).
 */
export default async function AdminInvoicesPage() {
  const invoices = await adminListInvoices()

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-medium">Invoices</h1>
        <p className="text-sm text-muted">
          {invoices.length} invoice{invoices.length === 1 ? '' : 's'} total.
        </p>
      </header>

      {invoices.length === 0 ? (
        <p className="text-sm text-muted">No invoices yet.</p>
      ) : (
        <div className="border border-border rounded-lg bg-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 font-medium">Order</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Sent</th>
                <th className="text-left px-4 py-2 font-medium">Paid</th>
                <th className="text-right px-4 py-2 font-medium">DM</th>
                <th className="text-right px-4 py-2 font-medium">Digital</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-2">
                    {inv.orders ? (
                      <Link
                        href={`/admin/orders/${inv.orders.order_number}`}
                        className="underline underline-offset-2"
                      >
                        #{inv.orders.order_number}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2">{inv.status}</td>
                  <td className="px-4 py-2 text-muted">
                    {inv.invoice_sent_date ? formatEventDate(inv.invoice_sent_date) : '—'}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {inv.invoice_paid_date ? formatEventDate(inv.invoice_paid_date) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {inv.invoiced_dm_total != null
                      ? formatMoney(Number(inv.invoiced_dm_total))
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {inv.invoiced_digital != null
                      ? formatMoney(Number(inv.invoiced_digital))
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
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
