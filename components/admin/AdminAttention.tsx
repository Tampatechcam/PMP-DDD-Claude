import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { Badge } from '@/components/ui/Badge'
import { formatEventDate, formatRelativeDate, orderHref, orderLabel } from '@/lib/utils/format'
import type { OrderRow } from '@/lib/db/orders'

/**
 * Admin "Needs attention" rail — pinned to the Overview page.
 *
 * Surfaces the two things ops actually has to act on:
 *   1. Orders with a DM-send deadline inside the next 7 days that
 *      haven't shipped yet (filtered out the moment `dm_status` flips
 *      to "Order Sent").
 *   2. Proofs waiting on the client — flagged via the same heuristic
 *      `statusTone()` uses ("Awaiting Your Approval" / similar).
 *
 * Receives the same `OrderRow[]` slice the Upcoming table uses, so
 * there's no extra DB round-trip. The parent (`/admin/page.tsx`)
 * fetches once and threads it in.
 */
export function AdminAttention({
  orders,
  clientNameById
}: {
  orders: OrderRow[]
  clientNameById: Record<string, string>
}) {
  const today = startOfToday()
  const horizon = addDays(today, 7)

  const tightDeadlines: OrderRow[] = orders
    .filter((o) => {
      if (!o.needs_direct_mail) return false
      if (!o.order_sent_deadline) return false
      if (o.dm_status && /order sent|complete/i.test(o.dm_status)) return false
      const d = parseISO(o.order_sent_deadline)
      return d && d >= today && d <= horizon
    })
    .sort((a, b) => (a.order_sent_deadline ?? '').localeCompare(b.order_sent_deadline ?? ''))
    .slice(0, 6)

  const awaitingProof: OrderRow[] = orders
    .filter((o) => /awaiting your approval|revision requested/i.test(o.display_status))
    .slice(0, 6)

  const empty = tightDeadlines.length === 0 && awaitingProof.length === 0
  if (empty) return null

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <AttentionList
        title="Send deadlines · next 7 days"
        icon="calendar"
        tone="warning"
        empty="No tight deadlines this week."
        orders={tightDeadlines}
        clientNameById={clientNameById}
        renderMeta={(o) => {
          const rel = formatRelativeDate(o.order_sent_deadline)
          return (
            <span className="text-xs text-warning whitespace-nowrap">
              {rel || formatEventDate(o.order_sent_deadline)}
            </span>
          )
        }}
      />
      <AttentionList
        title="Awaiting client decision"
        icon="document"
        tone="accent"
        empty="No proofs sitting with clients."
        orders={awaitingProof}
        clientNameById={clientNameById}
        renderMeta={(o) => (
          <Pill tone="warning" withDot>
            {o.display_status}
          </Pill>
        )}
      />
    </section>
  )
}

function AttentionList({
  title,
  icon,
  tone,
  orders,
  clientNameById,
  renderMeta,
  empty
}: {
  title: string
  icon: 'calendar' | 'document'
  tone: 'warning' | 'accent'
  orders: OrderRow[]
  clientNameById: Record<string, string>
  renderMeta: (o: OrderRow) => React.ReactNode
  empty: string
}) {
  const iconTone = tone === 'warning' ? 'text-warning' : 'text-accent'
  return (
    <Card className="!p-0 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg/30">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Icon name={icon} className={`w-4 h-4 ${iconTone}`} />
          {title}
        </h2>
        <Badge tone={tone}>{orders.length}</Badge>
      </header>
      {orders.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={orderHref(o, '/admin/orders')}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg group transition-colors focus-ring"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {orderLabel(o)}
                    {o.advisor_name && (
                      <span className="text-muted font-normal"> · {o.advisor_name}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {clientNameById[o.client_id] ?? '—'}
                    {o.market && ` · ${o.market}`}
                  </p>
                </div>
                {renderMeta(o)}
                <Icon
                  name="arrowRight"
                  className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ── Date helpers ───────────────────────────────────────────────── */

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}
function parseISO(s: string): Date | null {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d
}
