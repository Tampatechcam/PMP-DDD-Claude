import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { adminGetClient, adminListOfficesForClient } from '@/lib/db/clients'
import { adminListOrders } from '@/lib/db/orders'
import { formatMoney, formatQuantity } from '@/lib/utils/format'
import { OrdersList, type OrdersTab } from '@/components/orders/OrdersList'
import { TeamSection } from '@/components/admin/TeamSection'

interface Props {
  params: { id: string }
  // ?tab=past lands directly on the past-events table for this client.
  searchParams: { tab?: string }
}

/**
 * Admin client detail. Renders the static client info panel that the plan
 * (Part 17 #2) calls for. All the internal fields the client_self_view
 * strips out — responsibility, mailer rate, discount, tech sequences —
 * are visible here.
 */
export default async function AdminClientDetailPage({ params, searchParams }: Props) {
  // FTA already pushes ~170 orders, so bump the limit comfortably above
  // any one client's expected DM workload. OrdersList does its own
  // Upcoming/Past bucketing client-side after the fetch.
  const activeTab: OrdersTab = searchParams.tab === 'past' ? 'past' : 'upcoming'
  const [client, offices, orders] = await Promise.all([
    adminGetClient(params.id),
    adminListOfficesForClient(params.id),
    adminListOrders({ clientId: params.id, limit: 500 })
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
          <ul
            className={
              // Group clients (FTA, Sentinel/SAM RIA, AdvisorMax, Arrive) tend
              // to have many offices — a 2-col grid halves the vertical space
              // without losing any data. Independents (1 office) stay single-col.
              client.is_group
                ? 'grid grid-cols-1 md:grid-cols-2 gap-2'
                : 'space-y-2'
            }
          >
            {offices.map((o) => {
              const returnAddr = readFreeform(o.mailer_return_address)
              return (
                <li key={o.id}>
                  <Card>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium">
                        {o.name}
                        {o.is_primary && <span className="text-muted"> · primary</span>}
                      </p>
                      {o.state && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-bg text-muted border border-border">
                          {o.state}
                        </span>
                      )}
                    </div>
                    {o.advisor_names && o.advisor_names.length > 0 && (
                      <p className="text-xs text-muted mt-1">
                        Advisors: {o.advisor_names.join(', ')}
                      </p>
                    )}
                    {(o.registration_phone || o.registration_url_direct || returnAddr) && (
                      <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-xs">
                        {o.registration_phone && (
                          <>
                            <dt className="text-muted">Reg phone</dt>
                            <dd>{o.registration_phone}</dd>
                          </>
                        )}
                        {o.registration_url_direct && (
                          <>
                            <dt className="text-muted">Landing URL</dt>
                            <dd className="truncate">
                              <a
                                href={o.registration_url_direct}
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-2"
                              >
                                {o.registration_url_direct}
                              </a>
                            </dd>
                          </>
                        )}
                        {returnAddr && (
                          <>
                            <dt className="text-muted">Return addr</dt>
                            <dd className="whitespace-pre-line">{returnAddr}</dd>
                          </>
                        )}
                      </dl>
                    )}
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <TeamSection client={{ id: client.id, name: client.name }} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Orders</h2>
        <OrdersList
          orders={orders}
          activeTab={activeTab}
          basePath={`/admin/clients/${client.id}`}
          ordersBasePath="/admin/orders"
          // We're already on this client's page — hide the redundant
          // Client column so the table can breathe.
          showClient={false}
        />
      </section>
    </section>
  )
}

/**
 * `mailer_return_address` is jsonb; the importer stored the raw CSV
 * cell under a `freeform` key. Returns null if absent so the row hides.
 */
function readFreeform(addr: unknown): string | null {
  if (addr && typeof addr === 'object' && 'freeform' in addr) {
    const v = (addr as { freeform?: unknown }).freeform
    if (typeof v === 'string' && v.trim()) return v
  }
  return null
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
