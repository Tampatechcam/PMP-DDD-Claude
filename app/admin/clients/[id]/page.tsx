import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { adminGetClient, adminListOfficesForClient } from '@/lib/db/clients'
import { adminListOrders } from '@/lib/db/orders'
import { formatMoney, formatQuantity, formatEventDate } from '@/lib/utils/format'
import { StatusPill } from '@/components/orders/StatusPill'
import Link from 'next/link'

interface Props {
  params: { id: string }
}

/**
 * Admin client detail. Renders the static client info panel that the plan
 * (Part 17 #2) calls for. All the internal fields the client_self_view
 * strips out — responsibility, mailer rate, discount, tech sequences —
 * are visible here.
 */
export default async function AdminClientDetailPage({ params }: Props) {
  const [client, offices, orders] = await Promise.all([
    adminGetClient(params.id),
    adminListOfficesForClient(params.id),
    adminListOrders({ clientId: params.id, limit: 25 })
  ])
  if (!client) notFound()

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-medium">{client.name}</h1>
        <p className="text-sm text-muted">
          {client.is_group ? 'Group client' : 'Independent client'}
          {client.responsibility && ` · ${client.responsibility}`}
        </p>
      </header>

      <Card>
        <h2 className="text-sm font-medium mb-3">Business</h2>
        <Dl>
          <Dt>Business name</Dt><Dd>{client.business_name}</Dd>
          <Dt>Website</Dt><Dd>{client.business_website}</Dd>
          <Dt>EIN</Dt><Dd>{client.ein}</Dd>
          <Dt>EIN match name</Dt><Dd>{client.ein_match_name}</Dd>
          <Dt>Non-profit</Dt><Dd>{client.is_non_profit ? 'Yes' : 'No'}</Dd>
        </Dl>
      </Card>

      <Card>
        <h2 className="text-sm font-medium mb-3">Defaults</h2>
        <Dl>
          <Dt>Mailer type</Dt><Dd>{client.default_mailer_type}</Dd>
          <Dt>Class type</Dt><Dd>{client.default_class_type}</Dd>
          <Dt>Mailing quantity</Dt>
          <Dd>{client.default_mailing_quantity != null ? formatQuantity(client.default_mailing_quantity) : null}</Dd>
          <Dt>Digital budget</Dt>
          <Dd>{client.default_digital_budget != null ? formatMoney(Number(client.default_digital_budget)) : null}</Dd>
          <Dt>Disclaimer</Dt><Dd>{client.disclaimer}</Dd>
        </Dl>
      </Card>

      <Card>
        <h2 className="text-sm font-medium mb-3">Pricing &amp; ops (internal)</h2>
        <Dl>
          <Dt>Mailer rate</Dt>
          <Dd>{client.default_mailer_rate != null ? `$${client.default_mailer_rate}` : null}</Dd>
          <Dt>Direct mail discount</Dt><Dd>{client.direct_mail_discount}</Dd>
          <Dt>Tech / sequences</Dt><Dd>{client.tech_sequences}</Dd>
          <Dt>Start before paid</Dt><Dd>{client.start_before_paid ? 'Yes' : 'No'}</Dd>
        </Dl>
      </Card>

      {(client.description || client.notes) && (
        <Card>
          <h2 className="text-sm font-medium mb-3">Notes</h2>
          {client.description && <p className="text-sm">{client.description}</p>}
          {client.notes && <p className="text-sm text-muted mt-2">{client.notes}</p>}
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Offices ({offices.length})</h2>
        {offices.length === 0 ? (
          <p className="text-sm text-muted">No offices linked.</p>
        ) : (
          <ul className="space-y-2">
            {offices.map((o) => (
              <li key={o.id}>
                <Card>
                  <p className="text-sm font-medium">
                    {o.name}
                    {o.is_primary && <span className="text-muted"> · primary</span>}
                  </p>
                  {o.advisor_names && o.advisor_names.length > 0 && (
                    <p className="text-xs text-muted mt-1">
                      Advisors: {o.advisor_names.join(', ')}
                    </p>
                  )}
                  {o.registration_phone && (
                    <p className="text-xs text-muted">
                      Reg phone: {o.registration_phone}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Recent orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-lg bg-surface">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.order_number}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      #{o.order_number}
                      {o.class_type && <span className="text-muted"> · {o.class_type}</span>}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {formatEventDate(o.event_1_date)}
                      {o.market && ` · ${o.market}`}
                    </p>
                  </div>
                  <StatusPill status={o.display_status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}

function Dl({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {children}
    </dl>
  )
}
function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="text-xs text-muted">{children}</dt>
}
function Dd({ children }: { children: React.ReactNode }) {
  return <dd className="text-sm">{children ?? <span className="text-muted">—</span>}</dd>
}
