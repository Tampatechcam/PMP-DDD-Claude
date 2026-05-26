import Link from 'next/link'
import { OrdersList, type OrdersTab } from '@/components/orders/OrdersList'
import { Button } from '@/components/ui/Button'
import { adminListOrders, adminDistinctOrderStatuses } from '@/lib/db/orders'
import { adminListClients } from '@/lib/db/clients'

interface Props {
  searchParams: {
    client?: string
    class?: string
    needs?: string
    q?: string
    /** Inclusive YYYY-MM-DD event_1_date floor. */
    from?: string
    /** Inclusive YYYY-MM-DD event_1_date ceiling. */
    to?: string
    /** Exact match against `display_status` from the view. */
    status?: string
    tab?: string
  }
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const activeTab: OrdersTab = searchParams.tab === 'past' ? 'past' : 'upcoming'

  const [orders, clients, statuses] = await Promise.all([
    adminListOrders({
      clientId: searchParams.client || undefined,
      classType: searchParams.class || undefined,
      needs:
        searchParams.needs === 'direct_mail' || searchParams.needs === 'digital'
          ? searchParams.needs
          : undefined,
      search: searchParams.q || undefined,
      from: searchParams.from || undefined,
      to: searchParams.to || undefined,
      displayStatus: searchParams.status || undefined,
      limit: 500
    }),
    adminListClients(),
    adminDistinctOrderStatuses()
  ])

  const clientNameById = Object.fromEntries(clients.map((c) => [c.id, c.name]))
  const activeClient = clients.find((c) => c.id === searchParams.client)
  const filtersActive =
    searchParams.client ||
    searchParams.class ||
    searchParams.needs ||
    searchParams.q ||
    searchParams.from ||
    searchParams.to ||
    searchParams.status

  const preserve = {
    client: searchParams.client,
    class: searchParams.class,
    needs: searchParams.needs,
    q: searchParams.q,
    from: searchParams.from,
    to: searchParams.to,
    status: searchParams.status
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">All orders</h1>
        <p className="text-sm text-muted">
          {orders.length}
          {orders.length === 500 && ' (capped)'}
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
        </div>
        <Button href="/admin/orders/new">+ New order</Button>
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
        <SelectFilter
          name="status"
          label="Status"
          value={searchParams.status ?? ''}
          options={[
            { value: '', label: 'All' },
            ...statuses.map((s) => ({ value: s, label: s }))
          ]}
        />
        <DateFilter name="from" label="From" value={searchParams.from ?? ''} />
        <DateFilter name="to" label="To" value={searchParams.to ?? ''} />
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-ink mb-1">Search</label>
          <input
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="job, market, advisor…"
            className="block w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
        <Button type="submit">Apply</Button>
      </form>

      <OrdersList
        orders={orders}
        activeTab={activeTab}
        basePath="/admin/orders"
        ordersBasePath="/admin/orders"
        showClient
        clientNameById={clientNameById}
        preserveParams={preserve}
      />
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

function DateFilter({
  name,
  label,
  value
}: {
  name: string
  label: string
  value: string
}) {
  return (
    <div className="min-w-[140px]">
      <label className="block text-xs font-medium text-ink mb-1">{label}</label>
      <input
        type="date"
        name={name}
        defaultValue={value}
        className="block w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
      />
    </div>
  )
}
