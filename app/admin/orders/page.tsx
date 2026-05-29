import { OrdersList, type OrdersTab } from '@/components/orders/OrdersList'
import { Button } from '@/components/ui/Button'
import { FilterChips, type FilterChip } from '@/components/admin/FilterChips'
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

  // The current query state, threaded through the filter chips and the
  // tab navigation so removing one filter preserves the others.
  const preserve = {
    client: searchParams.client,
    class: searchParams.class,
    needs: searchParams.needs,
    q: searchParams.q,
    from: searchParams.from,
    to: searchParams.to,
    status: searchParams.status
  }

  // Build the chip list once, in the order they appear above the table.
  const needsLabel: Record<string, string> = {
    direct_mail: 'Direct mail',
    digital: 'Digital'
  }
  const chips: FilterChip[] = []
  if (activeClient)              chips.push({ key: 'client', label: 'Client',  value: activeClient.name })
  if (searchParams.class)        chips.push({ key: 'class',  label: 'Class',   value: searchParams.class })
  if (searchParams.needs)        chips.push({ key: 'needs',  label: 'Type',    value: needsLabel[searchParams.needs] ?? searchParams.needs })
  if (searchParams.status)       chips.push({ key: 'status', label: 'Status',  value: searchParams.status })
  if (searchParams.from)         chips.push({ key: 'from',   label: 'From',    value: searchParams.from })
  if (searchParams.to)           chips.push({ key: 'to',     label: 'To',      value: searchParams.to })
  if (searchParams.q)            chips.push({ key: 'q',      label: 'Search',  value: `“${searchParams.q}”` })

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">All orders</h1>
          <p className="text-sm text-muted">
            {orders.length}
            {orders.length === 500 && ' (capped at 500 — narrow with filters)'}
            {chips.length > 0 && ` · ${chips.length} filter${chips.length === 1 ? '' : 's'} active`}
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

      <FilterChips chips={chips} basePath="/admin/orders" current={preserve} />

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
