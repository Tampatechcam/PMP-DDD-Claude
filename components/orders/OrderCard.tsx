import { StatusPill } from './StatusPill'
import { ProofActions } from '@/components/proofs/ProofActions'
import {
  formatEventDate,
  formatMoney,
  formatQuantity,
  formatRelativeDate,
  formatTimeRange
} from '@/lib/utils/format'
import type { OrderRow, OrderEventRow } from '@/lib/db/orders'

type Proof = {
  id: string
  version: number
  // DB has a CHECK constraint on this; we keep `string` here so consumers
  // don't need to assert when pulling rows directly from supabase-js.
  status: string
  client_comment: string | null
  decided_at: string | null
  created_at: string
}

/**
 * One order, rendered per the Part 8 ASCII. Single column, no tabs, no
 * accordions. Sections only render when their data is present so a digital-
 * only order doesn't get an empty Direct Mail block.
 */
export function OrderCard({
  order,
  proofs,
  events
}: {
  order: OrderRow
  proofs: Proof[]
  events: OrderEventRow[]
}) {
  const events_array = [
    { date: order.event_1_date, room: order.event_1_room },
    { date: order.event_2_date, room: order.event_2_room },
    { date: order.event_3_date, room: order.event_3_room },
    { date: order.event_4_date, room: order.event_4_room }
  ].filter((e) => e.date)

  const types = [
    order.needs_direct_mail && 'Direct Mail',
    order.needs_digital && 'Digital',
    order.needs_google_sheet && 'Sheet'
  ].filter(Boolean)

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-medium">
            Order #{order.order_number}
            {order.event_1_date && (
              <span className="text-muted font-normal">
                {' · '}
                {formatEventDate(order.event_1_date)}
              </span>
            )}
          </h1>
          <StatusPill status={order.display_status} />
        </div>
        {(order.class_type || types.length > 0) && (
          <p className="text-sm text-muted">
            {[order.class_type, types.join(' + ')].filter(Boolean).join(' · ')}
          </p>
        )}
        {order.advisor_name && (
          <p className="text-sm text-muted">{order.advisor_name}</p>
        )}
      </header>

      {events_array.length > 0 && (
        <Section title="Events">
          <ul className="space-y-1.5 text-sm">
            {events_array.map((e, i) => {
              const rel = formatRelativeDate(e.date)
              const range = formatTimeRange(order.start_time, order.end_time)
              return (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                  <span>{formatEventDate(e.date)}</span>
                  {rel && <span className="text-xs text-muted">({rel})</span>}
                  {range && <span className="text-muted text-xs">· {range}</span>}
                  {e.room && <span className="text-muted text-xs">· {e.room}</span>}
                </li>
              )
            })}
          </ul>
          {order.time_notes && (
            <p className="text-xs text-muted">{order.time_notes}</p>
          )}
        </Section>
      )}

      {(order.venue_text || order.venue_address_text) && (
        <Section title="Venue">
          {order.venue_text && <p className="text-sm">{order.venue_text}</p>}
          {order.venue_address_text && (
            <p className="text-xs text-muted">{order.venue_address_text}</p>
          )}
        </Section>
      )}

      {order.needs_direct_mail && (
        <Section title="Direct mail">
          <p className="text-sm">
            {order.mailing_quantity && `${formatQuantity(order.mailing_quantity)} pieces`}
            {order.mailing_quantity && order.mailer_type && ' · '}
            {order.mailer_type}
          </p>
          {(order.client_approval_deadline || order.order_sent_deadline) && (
            <p className="text-xs text-muted">
              {order.client_approval_deadline &&
                `Approval: ${formatEventDate(order.client_approval_deadline)}`}
              {order.client_approval_deadline && order.order_sent_deadline && ' · '}
              {order.order_sent_deadline &&
                `Send deadline: ${formatEventDate(order.order_sent_deadline)}`}
            </p>
          )}
          {order.sending_list_folder_url && (
            <p className="text-xs">
              <a
                href={order.sending_list_folder_url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Sending list
              </a>
            </p>
          )}
        </Section>
      )}

      {order.needs_digital && (
        <Section title="Digital">
          <p className="text-sm">
            {order.digital_budget != null && `Budget ${formatMoney(Number(order.digital_budget))}`}
          </p>
          {(order.landing_page_url_digital || order.landing_page_url_direct) && (
            <p className="text-xs text-muted">
              {order.landing_page_url_digital ?? order.landing_page_url_direct}
            </p>
          )}
        </Section>
      )}

      {proofs.length > 0 && (
        <Section title="Proofs">
          <ul className="space-y-4 text-sm">
            {proofs.map((p) => (
              <li key={p.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span>
                    v{p.version}
                    <span className="text-muted"> · uploaded {formatEventDate(p.created_at)}</span>
                  </span>
                  <StatusPill status={proofStatusLabel(p.status)} />
                </div>
                {p.client_comment && (
                  <p className="text-xs text-muted">“{p.client_comment}”</p>
                )}
                <ProofActions proofId={p.id} status={p.status} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {events.length > 0 && (
        <Section title="History">
          <ul className="space-y-1 text-sm">
            {events.map((e) => (
              <li key={e.id} className="text-xs">
                <span className="text-muted">{formatEventDate(e.created_at)}</span>
                {' — '}
                {e.event}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(order.notes || order.order_instructions) && (
        <Section title="Notes">
          {order.order_instructions && (
            <p className="text-sm">{order.order_instructions}</p>
          )}
          {order.notes && <p className="text-sm text-muted">{order.notes}</p>}
        </Section>
      )}
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border pt-4">
      <h2 className="text-[11px] font-semibold tracking-wider text-muted uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

function proofStatusLabel(s: string): string {
  switch (s) {
    case 'pending': return 'Awaiting Your Approval'
    case 'approved': return 'Approved'
    case 'revision_requested': return 'Revision Requested'
    default: return s
  }
}
