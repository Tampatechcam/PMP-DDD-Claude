import Link from 'next/link'
import { StatusPill } from './StatusPill'
import { Icon } from '@/components/ui/Icon'
import { formatEventDate, formatRelativeDate } from '@/lib/utils/format'
import type { OrderRow } from '@/lib/db/orders'

/**
 * Orders grouped into four buckets:
 *   Upcoming  — event_1_date in the next 3 weeks (the active production
 *               window where ops is doing real work). Open by default.
 *   Past      — event_1_date already happened. Collapsed.
 *   Later     — event_1_date more than 3 weeks out. Collapsed.
 *   No date   — event_1_date is null (placeholder orders). Collapsed.
 *
 * Each bucket is a native <details> element so the open/closed state is
 * preserved across navigation by the browser, no client JS needed.
 */
const UPCOMING_WINDOW_DAYS = 21 // 3 weeks

type Bucket = 'upcoming' | 'past' | 'later' | 'none'

function bucketOf(d: string | null | undefined): Bucket {
  if (!d) return 'none'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'past'
  if (diff > UPCOMING_WINDOW_DAYS) return 'later'
  return 'upcoming'
}

export function OrdersList({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-10 text-center bg-surface">
        <p className="text-sm font-medium">No orders yet</p>
        <p className="text-xs text-muted mt-1">
          New orders show up here, sorted by event date.
        </p>
      </div>
    )
  }

  const buckets: Record<Bucket, OrderRow[]> = {
    upcoming: [],
    past: [],
    later: [],
    none: []
  }
  for (const o of orders) buckets[bucketOf(o.event_1_date)].push(o)

  // Upcoming should ascend (closest event first); the others can stay in
  // the SQL view's event_1_date desc order so most-recent-first feels right.
  buckets.upcoming.sort((a, b) => {
    const da = a.event_1_date ?? ''
    const db = b.event_1_date ?? ''
    return da.localeCompare(db)
  })

  return (
    <div className="space-y-3">
      <Group
        title="Upcoming"
        subtitle={`Events in the next ${UPCOMING_WINDOW_DAYS / 7} weeks`}
        orders={buckets.upcoming}
        defaultOpen
      />
      <Group
        title="Past"
        subtitle="Events already happened"
        orders={buckets.past}
      />
      <Group
        title="Later"
        subtitle={`Events more than ${UPCOMING_WINDOW_DAYS / 7} weeks out`}
        orders={buckets.later}
      />
      <Group
        title="No date yet"
        subtitle="Placeholder orders without an event date"
        orders={buckets.none}
      />
    </div>
  )
}

function Group({
  title,
  subtitle,
  orders,
  defaultOpen = false
}: {
  title: string
  subtitle: string
  orders: OrderRow[]
  defaultOpen?: boolean
}) {
  if (orders.length === 0) return null

  return (
    <details
      open={defaultOpen}
      className="group border border-border rounded-lg bg-surface overflow-hidden"
    >
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-bg transition-colors list-none [&::-webkit-details-marker]:hidden">
        <Caret />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold">{title}</h2>
            <span className="text-xs text-muted">
              {orders.length} order{orders.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
      </summary>
      <ul className="divide-y divide-border border-t border-border">
        {orders.map((o) => (
          <li key={o.id}>
            <Row order={o} />
          </li>
        ))}
      </ul>
    </details>
  )
}

function Caret() {
  // Rotated by group-open via CSS. Single icon, no extra JS.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-4 h-4 text-muted transition-transform group-open:rotate-90 shrink-0"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Row({ order: o }: { order: OrderRow }) {
  const rel = formatRelativeDate(o.event_1_date)
  return (
    <Link
      href={`/orders/${o.order_number}`}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-bg transition-colors group/row"
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {o.event_1_date ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="calendar" className="w-3.5 h-3.5" />
              {formatEventDate(o.event_1_date)}
              {rel && <span className="text-muted/70"> · {rel}</span>}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted/70 italic">
              <Icon name="calendar" className="w-3.5 h-3.5" />
              date pending
            </span>
          )}
          {o.venue_text ? (
            <span className="inline-flex items-center gap-1 truncate">
              <Icon name="mapPin" className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{o.venue_text}</span>
            </span>
          ) : o.market ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="mapPin" className="w-3.5 h-3.5" />
              {o.market}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted/70 italic">
              <Icon name="mapPin" className="w-3.5 h-3.5" />
              venue pending
            </span>
          )}
        </div>
      </div>
      <StatusPill status={o.display_status} />
      <Icon name="arrowRight" className="w-4 h-4 text-muted opacity-0 group-hover/row:opacity-100 transition-opacity" />
    </Link>
  )
}
