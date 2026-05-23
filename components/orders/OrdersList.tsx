import Link from 'next/link'
import { StatusPill } from './StatusPill'
import { Icon } from '@/components/ui/Icon'
import { formatEventDate, formatRelativeDate } from '@/lib/utils/format'
import type { OrderRow } from '@/lib/db/orders'

/**
 * Orders list, row-divided, with hierarchy:
 *   #order  · class                                          [status pill]
 *   📅 event date · 📍 venue · advisor
 */
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

  return (
    <ul className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
      {orders.map((o) => {
        const rel = formatRelativeDate(o.event_1_date)
        return (
          <li key={o.id}>
            <Link
              href={`/orders/${o.order_number}`}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-bg transition-colors group"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">#{o.order_number}</span>
                  {o.class_type && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-bg text-muted">
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
              <Icon name="arrowRight" className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
