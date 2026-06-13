import Link from 'next/link'
import { StatusPill } from './StatusPill'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatEventDate, formatRelativeDate, orderHref, orderLabel } from '@/lib/utils/format'
import { SelectableOrdersTable } from '@/components/admin/SelectableOrdersTable'
import type { OrderRow } from '@/lib/db/orders'

/**
 * Two tabs (Upcoming / Past events), rendered as a real table. Tab choice
 * lives in the URL (?tab=past) so refresh + sharing work. Which tab a row
 * lands in is decided by `tabOf` below (see its comment for the rules).
 */

export type OrdersTab = 'upcoming' | 'past'

/**
 * The Orders table tracks direct-mail orders. Digital-only campaigns
 * (no DM component) fall out of both tabs — they aren't "events" in
 * the production sense.
 *
 * Past     = the event has already happened (event_1_date < today).
 * Upcoming = the event is in the future AND the DM hasn't been sent
 *            yet (Pending Details, All Details Added, Proof Sent…).
 *
 * The middle case — DM has been mailed but the event is still ahead —
 * is intentionally hidden from both tabs. Per user direction, Order
 * Sent can't appear in Upcoming, and a future seminar shouldn't show
 * up in Past either.
 */
function tabOf(o: OrderRow): OrdersTab | null {
  if (!o.needs_direct_mail) return null
  if (!o.event_1_date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(o.event_1_date)
  d.setHours(0, 0, 0, 0)
  if (d.getTime() < today.getTime()) return 'past'
  // Future event:
  if (o.dm_status && o.dm_status.toLowerCase().includes('order sent')) {
    return null // mail's out, waiting for the date — hidden from both
  }
  return 'upcoming'
}

interface Props {
  orders: OrderRow[]
  activeTab: OrdersTab
  /** Where the Upcoming / Past tab links live (e.g. '/admin' or '/admin/clients/<id>'). */
  basePath: string
  /**
   * Where each order row links to. Admin pages should pass '/admin/orders'
   * so the order detail opens inside the admin shell (sidebar visible);
   * client pages leave this null and fall back to '/orders'.
   */
  ordersBasePath?: string
  showClient?: boolean
  clientNameById?: Record<string, string>
  preserveParams?: Record<string, string | undefined>
  /** Admin only: render row checkboxes + a bulk-delete toolbar. */
  selectable?: boolean
}

export function OrdersList({
  orders,
  activeTab,
  basePath,
  ordersBasePath,
  showClient,
  clientNameById,
  preserveParams,
  selectable
}: Props) {
  const upcoming: OrderRow[] = []
  const past: OrderRow[] = []
  for (const o of orders) {
    const tab = tabOf(o)
    if (tab === 'upcoming') upcoming.push(o)
    else if (tab === 'past') past.push(o)
  }

  // Both tabs: soonest event_1_date first (ascending).
  upcoming.sort(byEventDateAsc)
  past.sort(byEventDateAsc)

  const visible = activeTab === 'past' ? past : upcoming

  return (
    <div className="space-y-4">
      <Tabs
        active={activeTab}
        upcomingCount={upcoming.length}
        pastCount={past.length}
        basePath={basePath}
        preserveParams={preserveParams}
      />
      {visible.length === 0 ? (
        <OrdersEmpty tab={activeTab} basePath={basePath} />
      ) : selectable ? (
        <SelectableOrdersTable
          orders={visible}
          showClient={showClient}
          clientNameById={clientNameById}
          isPast={activeTab === 'past'}
          ordersBasePath={ordersBasePath}
        />
      ) : (
        <Table
          orders={visible}
          showClient={showClient}
          clientNameById={clientNameById}
          isPast={activeTab === 'past'}
          ordersBasePath={ordersBasePath}
        />
      )}
    </div>
  )
}

function byEventDateAsc(a: OrderRow, b: OrderRow) {
  const da = a.event_1_date ?? '9999-12-31'
  const db = b.event_1_date ?? '9999-12-31'
  return da.localeCompare(db)
}

function Tabs({
  active,
  upcomingCount,
  pastCount,
  basePath,
  preserveParams
}: {
  active: OrdersTab
  upcomingCount: number
  pastCount: number
  basePath: string
  preserveParams?: Record<string, string | undefined>
}) {
  const buildHref = (tab: OrdersTab) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(preserveParams ?? {})) {
      if (v) params.set(k, v)
    }
    if (tab === 'past') params.set('tab', 'past')
    else params.delete('tab')
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <div className="border-b border-border">
      <nav className="flex gap-1 -mb-px">
        <Tab href={buildHref('upcoming')} active={active === 'upcoming'} label="Upcoming" count={upcomingCount} />
        <Tab href={buildHref('past')} active={active === 'past'} label="Past events" count={pastCount} />
      </nav>
    </div>
  )
}

function Tab({
  href,
  active,
  label,
  count
}: {
  href: string
  active: boolean
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
        active
          ? 'border-accent text-ink font-medium'
          : 'border-transparent text-muted hover:text-ink hover:border-border'
      }`}
    >
      {label}
      <span
        className={`text-[11px] tnum px-1.5 py-0.5 rounded-full border ${
          active
            ? 'bg-accent/10 text-accent border-accent/20'
            : 'bg-bg text-muted border-border'
        }`}
      >
        {count}
      </span>
    </Link>
  )
}

function OrdersEmpty({ tab, basePath }: { tab: OrdersTab; basePath: string }) {
  return (
    <EmptyState
      icon={tab === 'past' ? 'calendar' : 'orders'}
      title={tab === 'past' ? 'No past events yet' : 'No upcoming orders'}
      description={
        tab === 'past'
          ? 'Orders move here once the DM is sent or the first-class day passes.'
          : 'Orders show up here while the DM is still being prepped. Start a new one when you’re ready.'
      }
      action={
        tab === 'past' || !basePath.startsWith('/admin')
          ? null
          : <Button href="/admin/orders/new" variant="secondary">+ New order</Button>
      }
    />
  )
}

function Table({
  orders,
  showClient,
  clientNameById,
  isPast,
  ordersBasePath
}: {
  orders: OrderRow[]
  showClient?: boolean
  clientNameById?: Record<string, string>
  isPast: boolean
  ordersBasePath?: string
}) {
  return (
    <div className="border border-border rounded-lg bg-surface shadow-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="label bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/60 sticky top-0 z-10">
          <tr className="border-b border-border">
            <Th className="w-[7%]">Order</Th>
            {!isPast && <Th className="w-[17%]">Order Sent Deadline</Th>}
            <Th className="w-[13%]">First Event date</Th>
            <Th className="w-[13%]">Second Event date</Th>
            {showClient && <Th className="w-[10%]">Client</Th>}
            <Th className="w-[9%]">Advisor</Th>
            <Th>Venue</Th>
            <Th className="w-[11%]">Status</Th>
            <Th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((o) => (
            <Row
              key={o.id}
              order={o}
              showClient={showClient}
              clientName={clientNameById?.[o.client_id]}
              isPast={isPast}
              ordersBasePath={ordersBasePath}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`text-left px-3 py-2.5 font-semibold whitespace-nowrap${className ? ` ${className}` : ''}`}>{children}</th>
}

function Row({
  order: o,
  showClient,
  clientName,
  isPast,
  ordersBasePath
}: {
  order: OrderRow
  showClient?: boolean
  clientName?: string
  isPast: boolean
  ordersBasePath?: string
}) {
  const osdRel = formatRelativeDate(o.order_sent_deadline)
  const href = orderHref(o, ordersBasePath)
  return (
    <tr className="relative hover:bg-bg transition-colors group border-l-2 border-transparent hover:border-accent">
      <td className="px-3 py-2.5 whitespace-nowrap">
        <Link
          href={href}
          className="font-medium rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent before:absolute before:inset-0 before:content-['']"
        >
          {orderLabel(o)}
        </Link>
        {o.class_type && (
          <span className="ml-2 align-middle">
            <Badge>{o.class_type}</Badge>
          </span>
        )}
      </td>
      {!isPast && (
        <td className="px-3 py-2.5 tnum">
          {o.order_sent_deadline ? (
            <>
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Icon name="calendar" className="w-3.5 h-3.5 text-muted" />
                {formatEventDate(o.order_sent_deadline)}
              </span>
              {osdRel && (
                <p className="text-xs text-muted mt-0.5">{osdRel}</p>
              )}
            </>
          ) : (
            <span className="italic text-muted/70">—</span>
          )}
        </td>
      )}
      <td className="px-3 py-2.5 whitespace-nowrap tnum">
        {o.event_1_date ? formatEventDate(o.event_1_date) : <span className="italic text-muted/70">pending</span>}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-muted tnum">
        {o.event_2_date ? formatEventDate(o.event_2_date) : <span className="italic text-muted/70">—</span>}
      </td>
      {showClient && (
        <td className="px-3 py-2.5 truncate max-w-[14rem]">
          {clientName ?? <span className="text-muted">—</span>}
        </td>
      )}
      <td className="px-3 py-2.5 truncate max-w-[10rem]">
        {o.advisor_name ?? <span className="text-muted">—</span>}
      </td>
      <td className="px-3 py-2.5 max-w-[32rem] align-top">
        <span className="line-clamp-2">
          {o.venue_text ?? o.market ?? <span className="text-muted italic">pending</span>}
        </span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <StatusPill status={o.display_status} />
      </td>
      <td className="px-3 py-2.5 w-8 text-right">
        <Icon
          name="arrowRight"
          className="inline-flex w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </td>
    </tr>
  )
}
