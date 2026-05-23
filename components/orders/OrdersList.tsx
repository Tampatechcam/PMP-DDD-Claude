import Link from 'next/link'
import { StatusPill } from './StatusPill'
import { formatEventDate } from '@/lib/utils/format'
import type { OrderRow } from '@/lib/db/orders'

/**
 * One row per order, sorted by event_1_date desc (the SQL does the sort).
 * Row dividers, no zebra (Part 9).
 */
export function OrdersList({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-muted">No orders yet.</p>
  }

  return (
    <ul className="divide-y divide-border border border-border rounded-lg bg-surface">
      {orders.map((o) => (
        <li key={o.id}>
          <Link
            href={`/orders/${o.order_number}`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                Order #{o.order_number}
                {o.class_type && <span className="text-muted"> · {o.class_type}</span>}
              </p>
              <p className="text-xs text-muted truncate">
                {formatEventDate(o.event_1_date)}
                {o.venue_text && <> · {o.venue_text}</>}
                {!o.venue_text && o.market && <> · {o.market}</>}
              </p>
            </div>
            <StatusPill status={o.display_status} />
          </Link>
        </li>
      ))}
    </ul>
  )
}
