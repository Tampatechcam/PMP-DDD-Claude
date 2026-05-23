import Link from 'next/link'
import { StatusPill } from './StatusPill'
import { Icon } from '@/components/ui/Icon'
import { formatEventDate, formatRelativeDate } from '@/lib/utils/format'
import type { OrderRow } from '@/lib/db/orders'

/**
 * Two tabs:
 *   Upcoming     — pivot date is today or later (work still to do).
 *   Past events  — pivot date is in the past OR dm_status is "Order Sent"
 *                  (active work done even if seminar is still ahead).
 *
 * The pivot date is `first_class_day` (the DM drop date — what ops actually
 * tracks) with `event_1_date` as a fallback for digital-only orders that
 * have no DM drop. If neither is set, the order lands in Upcoming so it
 * stays visible until someone fills the date in.
 *
 * Rendered as a real table. Tab choice lives in the URL (?tab=past) so
 * refresh + sharing work.
 */

export type OrdersTab = 'upcoming' | 'past'

function pivotDate(o: OrderRow): string | null {
  return o.order_sent_deadline ?? o.event_1_date ?? null
}

/**
 * The Orders table tracks direct-mail orders. Digital-only campaigns
 * (no DM component) fall out of both tabs — they aren't "events" in the
 * production sense, just standalone campaigns shown elsewhere.
 *
 * Past = the DM has been mailed (`dm_status = "Order Sent"`).
 * Upcoming = anything else still being prepped (Pending Details,
 * All Details Added, Proof Sent to Client, …). Order Sent never
 * appears in Upcoming.
 */
function tabOf(o: OrderRow): OrdersTab | null {
  if (!o.needs_direct_mail) return null
  if (!o.event_1_date) return null
  if (o.dm_status && o.dm_status.toLowerCase().includes('order sent')) {
    return 'past'
  }
  return 'upcoming'
}

interface Props {
  orders: OrderRow[]
  activeTab: OrdersTab
  basePath: string
  showClient?: boolean
  clientNameById?: Record<string, string>
  preserveParams?: Record<string, string | undefined>
}

export function OrdersList({
  orders,
  activeTab,
  basePath,
  showClient,
  clientNameById,
  preserveParams
}: Props) {
  const upcoming = orders.filter((o) => tabOf(o) === 'upcoming')
  const past = orders.filter((o) => tabOf(o) === 'past')

  // Both tabs sort newest-first per user direction: most recent past at
  // the top of Past, furthest-out future at the top of Upcoming.
  upcoming.sort(byPivotDesc)
  past.sort(byPivotDesc)

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
        <EmptyState tab={activeTab} />
      ) : (
        <Table
          orders={visible}
          showClient={showClient}
          clientNameById={clientNameById}
        />
      )}
    </div>
  )
}

function byPivotAsc(a: OrderRow, b: OrderRow) {
  const da = pivotDate(a) ?? '9999-12-31'
  const db = pivotDate(b) ?? '9999-12-31'
  return da.localeCompare(db)
}
function byPivotDesc(a: OrderRow, b: OrderRow) {
  const da = pivotDate(a) ?? '0000-01-01'
  const db = pivotDate(b) ?? '0000-01-01'
  return db.localeCompare(da)
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
      className={`inline-flex items-baseline gap-2 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
        active
          ? 'border-accent text-ink font-medium'
          : 'border-transparent text-muted hover:text-ink hover:border-border'
      }`}
    >
      {label}
      <span className={`text-xs ${active ? 'text-muted' : 'text-muted/70'}`}>
        {count}
      </span>
    </Link>
  )
}

function EmptyState({ tab }: { tab: OrdersTab }) {
  return (
    <div className="border border-dashed border-border rounded-lg p-10 text-center bg-surface">
      <p className="text-sm font-medium">
        No {tab === 'past' ? 'past events' : 'upcoming orders'}
      </p>
      <p className="text-xs text-muted mt-1">
        {tab === 'past'
          ? 'Orders move here once the DM is sent or the first-class day passes.'
          : 'Orders show up here while the DM is still being prepped.'}
      </p>
    </div>
  )
}

function Table({
  orders,
  showClient,
  clientNameById
}: {
  orders: OrderRow[]
  showClient?: boolean
  clientNameById?: Record<string, string>
}) {
  return (
    <div className="border border-border rounded-lg bg-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-muted bg-bg">
          <tr className="border-b border-border">
            <Th>Order</Th>
            <Th>Order Sent Deadline</Th>
            <Th>First Event date</Th>
            <Th>Second Event date</Th>
            {showClient && <Th>Client</Th>}
            <Th>Advisor</Th>
            <Th>Venue</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((o) => (
            <Row
              key={o.id}
              order={o}
              showClient={showClient}
              clientName={clientNameById?.[o.client_id]}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">{children}</th>
}

function Row({
  order: o,
  showClient,
  clientName
}: {
  order: OrderRow
  showClient?: boolean
  clientName?: string
}) {
  const osdRel = formatRelativeDate(o.order_sent_deadline)
  return (
    <tr className="hover:bg-bg transition-colors group">
      <td className="px-3 py-2.5 whitespace-nowrap">
        <Link href={`/orders/${o.order_number}`} className="font-medium">
          #{o.order_number}
        </Link>
        {o.class_type && (
          <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-bg text-muted border border-border">
            {o.class_type}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        {o.order_sent_deadline ? (
          <span>
            <span className="inline-flex items-center gap-1">
              <Icon name="calendar" className="w-3.5 h-3.5 text-muted" />
              {formatEventDate(o.order_sent_deadline)}
            </span>
            {osdRel && <span className="text-xs text-muted ml-1">· {osdRel}</span>}
          </span>
        ) : (
          <span className="italic text-muted/70">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        {o.event_1_date ? formatEventDate(o.event_1_date) : <span className="italic text-muted/70">pending</span>}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-muted">
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
        <Link
          href={`/orders/${o.order_number}`}
          className="inline-flex"
          aria-label={`Open order #${o.order_number}`}
        >
          <Icon
            name="arrowRight"
            className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </Link>
      </td>
    </tr>
  )
}
