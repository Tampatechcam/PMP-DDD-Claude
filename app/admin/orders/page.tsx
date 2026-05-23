import Link from 'next/link'
import { adminListOrders } from '@/lib/db/orders'
import { adminListClients } from '@/lib/db/clients'
import { StatusPill } from '@/components/orders/StatusPill'
import { Icon } from '@/components/ui/Icon'
import { formatEventDate, formatRelativeDate } from '@/lib/utils/format'

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
 * so saved searches are sharable. Capped at 200; paging is a fast-follow.
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

  const activeClient = clients.find((c) => c.id === searchParams.client)
  const filtersActive =
    searchParams.client || searchParams.class || searchParams.needs || searchParams.q

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">All orders</h1>
        <p className="text-sm text-muted">
          Showing {orders.length}
          {orders.length === 200 && ' (capped at 200)'}
          {activeClient && <> · client: {activeClient.name}</>}
          {filtersActive && (
            <>
              {' · '}
              <Link href="/admin/orders" className="underline underline-offset-2">
                clear filters
              </Link>
            </>
          )}
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
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-ink mb-1">Search</label>
          <input
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="job, market, advisor…"
            className="block w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded text-sm font-medium px-3 py-2 bg-accent text-white hover:opacity-90"
        >
          Apply
        </button>
      </form>

      {orders.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center bg-surface">
          <p className="text-sm font-medium">No orders match those filters</p>
          <p className="text-xs text-muted mt-1">
            Try clearing one and applying again.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
          {orders.map((o) => {
            const rel = formatRelativeDate(o.event_1_date)
            return (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.order_number}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-bg group transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">#{o.order_number}</span>
                      {o.class_type && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-bg text-muted border border-border">
                          {o.class_type}
                        </span>
                      )}
                      {o.advisor_name && (
                        <span className="text-muted">· {o.advisor_name}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      {o.event_1_date && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="calendar" className="w-3.5 h-3.5" />
                          {formatEventDate(o.event_1_date)}
                          {rel && <span className="text-muted/70"> · {rel}</span>}
                        </span>
                      )}
                      {o.market && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Icon name="mapPin" className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{o.market}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusPill status={o.display_status} />
                  <Icon name="arrowRight" className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            )
          })}
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
    <div className="min-w-[160px]">
      <label className="block text-xs font-medium text-ink mb-1">{label}</label>
      <select
        name={name}
        defaultValue={value}
        className="block w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
