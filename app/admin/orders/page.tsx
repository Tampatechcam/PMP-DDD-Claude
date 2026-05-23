import Link from 'next/link'
import { adminListOrders } from '@/lib/db/orders'
import { adminListClients } from '@/lib/db/clients'
import { StatusPill } from '@/components/orders/StatusPill'
import { formatEventDate } from '@/lib/utils/format'

interface Props {
  searchParams: {
    client?: string
    class?: string
    needs?: string
    q?: string
  }
}

/**
 * /admin/orders — global orders list with simple filters. State in the URL
 * so saved searches are sharable. We cap the list at 200 for now; if PMP
 * ever needs paging, we'll add it then.
 */
export default async function AdminOrdersPage({ searchParams }: Props) {
  const [orders, clients] = await Promise.all([
    adminListOrders({
      clientId: searchParams.client || undefined,
      classType: searchParams.class || undefined,
      needs:
        searchParams.needs === 'direct_mail' || searchParams.needs === 'digital'
          ? searchParams.needs
          : undefined,
      search: searchParams.q || undefined,
      limit: 200
    }),
    adminListClients()
  ])

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-medium">All orders</h1>
        <p className="text-sm text-muted">
          Showing {orders.length}
          {orders.length === 200 && ' (capped)'} ·{' '}
          <Link href="/admin/orders" className="underline underline-offset-2">
            Clear filters
          </Link>
        </p>
      </header>

      <form
        method="get"
        className="flex flex-wrap items-end gap-2 bg-surface border border-border rounded-lg p-3"
      >
        <SelectFilter
          name="client"
          label="Client"
          value={searchParams.client ?? ''}
          options={[
            { value: '', label: 'All clients' },
            ...clients.map((c) => ({ value: c.id, label: c.name }))
          ]}
        />
        <SelectFilter
          name="class"
          label="Class"
          value={searchParams.class ?? ''}
          options={[
            { value: '', label: 'All' },
            { value: 'R101', label: 'R101' },
            { value: 'W101', label: 'W101' },
            { value: 'SS101', label: 'SS101' },
            { value: 'WAT', label: 'WAT' },
            { value: 'R90', label: 'R90' },
            { value: 'Taxes', label: 'Taxes' }
          ]}
        />
        <SelectFilter
          name="needs"
          label="Type"
          value={searchParams.needs ?? ''}
          options={[
            { value: '', label: 'All' },
            { value: 'direct_mail', label: 'Direct mail' },
            { value: 'digital', label: 'Digital' }
          ]}
        />
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-ink mb-1">Search</label>
          <input
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="job, market, advisor"
            className="block w-full rounded border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded text-sm font-medium px-3 py-2 bg-accent text-white"
        >
          Apply
        </button>
      </form>

      {orders.length === 0 ? (
        <p className="text-sm text-muted">No orders match those filters.</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg bg-surface">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.order_number}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    #{o.order_number}
                    {o.class_type && <span className="text-muted"> · {o.class_type}</span>}
                    {o.advisor_name && (
                      <span className="text-muted"> · {o.advisor_name}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {formatEventDate(o.event_1_date)}
                    {o.market && ` · ${o.market}`}
                  </p>
                </div>
                <StatusPill status={o.display_status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SelectFilter({
  name,
  label,
  value,
  options
}: {
  name: string
  label: string
  value: string
  options: { value: string; label: string }[]
}) {
  return (
    <div className="min-w-[140px]">
      <label className="block text-xs font-medium text-ink mb-1">{label}</label>
      <select
        name={name}
        defaultValue={value}
        className="block w-full rounded border border-border bg-surface px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
