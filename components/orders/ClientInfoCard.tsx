import { Card } from '@/components/ui/Card'

/**
 * Static client info card — pulled from the Client Dictionary. Rendered
 * on every order detail page so ops doesn't have to bounce back to the
 * clients list.
 *
 * The `admin` flag toggles whether internal fields (mailer rate, discount,
 * tech sequences, responsibility) are shown. The client-facing version
 * sticks to what `client_self_view` exposes.
 */

type ClientLite = {
  name: string
  is_group?: boolean | null
  business_name?: string | null
  business_website?: string | null
  ein?: string | null
  ein_match_name?: string | null
  disclaimer?: string | null
  description?: string | null
  notes?: string | null
  default_mailer_type?: string | null
  default_class_type?: string | null
  default_mailing_quantity?: number | null
  default_digital_budget?: number | string | null
  is_non_profit?: boolean | null
  // Internal — admin only.
  default_mailer_rate?: number | string | null
  direct_mail_discount?: string | null
  tech_sequences?: string | null
  responsibility?: string | null
  start_before_paid?: boolean | null
}

type OfficeLite = {
  name: string
  state?: string | null
  registration_phone?: string | null
  registration_url_direct?: string | null
  registration_url_digital?: string | null
  advisor_names?: string[] | null
  // jsonb in DB — the importer stores the freeform string under `freeform`.
  mailer_return_address?: { freeform?: string } | Record<string, unknown> | null
} | null

export function ClientInfoCard({
  client,
  office,
  admin = false
}: {
  client: ClientLite
  office?: OfficeLite
  admin?: boolean
}) {
  return (
    <Card as="section" className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold">{client.name}</h2>
        <p className="text-xs text-muted">
          {client.is_group ? 'Group client' : 'Independent client'}
          {client.responsibility && admin && ` · ${client.responsibility}`}
          {client.is_non_profit && ' · non-profit'}
        </p>
      </header>

      <Dl>
        <Dt>Business name</Dt><Dd>{client.business_name}</Dd>
        <Dt>Website</Dt>
        <Dd>
          {client.business_website ? (
            <a
              href={client.business_website}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {client.business_website}
            </a>
          ) : null}
        </Dd>
        <Dt>EIN</Dt><Dd>{client.ein}</Dd>
        {client.ein_match_name && (
          <>
            <Dt>EIN match name</Dt><Dd>{client.ein_match_name}</Dd>
          </>
        )}
      </Dl>

      {client.disclaimer && (
        <div>
          <p className="label mb-1">
            Disclaimer
          </p>
          <p className="text-xs leading-relaxed">{client.disclaimer}</p>
        </div>
      )}

      {(client.default_mailer_type ||
        client.default_class_type ||
        client.default_mailing_quantity ||
        client.default_digital_budget) && (
        <div>
          <p className="label mb-1">
            Defaults
          </p>
          <Dl>
            <Dt>Mailer type</Dt><Dd>{client.default_mailer_type}</Dd>
            <Dt>Class type</Dt><Dd>{client.default_class_type}</Dd>
            <Dt>Mailing quantity</Dt>
            <Dd>{client.default_mailing_quantity?.toLocaleString('en-US') ?? null}</Dd>
            <Dt>Digital budget</Dt>
            <Dd>
              {client.default_digital_budget != null
                ? `$${Number(client.default_digital_budget).toLocaleString('en-US')}`
                : null}
            </Dd>
          </Dl>
        </div>
      )}

      {admin && (client.default_mailer_rate != null ||
        client.direct_mail_discount ||
        client.tech_sequences) && (
        <div>
          <p className="label mb-1">
            Pricing &amp; ops (internal)
          </p>
          <Dl>
            <Dt>Mailer rate</Dt>
            <Dd>
              {client.default_mailer_rate != null
                ? `$${client.default_mailer_rate}`
                : null}
            </Dd>
            <Dt>Direct mail discount</Dt><Dd>{client.direct_mail_discount}</Dd>
            <Dt>Tech / sequences</Dt><Dd>{client.tech_sequences}</Dd>
            <Dt>Start before paid</Dt>
            <Dd>{client.start_before_paid != null ? (client.start_before_paid ? 'Yes' : 'No') : null}</Dd>
          </Dl>
        </div>
      )}

      {office && (
        <div>
          <p className="label mb-1">
            Office
          </p>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium">{office.name}</p>
            {office.state && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-bg text-muted border border-border">
                {office.state}
              </span>
            )}
          </div>
          {office.advisor_names && office.advisor_names.length > 0 && (
            <p className="text-xs text-muted mt-0.5">
              Advisors: {office.advisor_names.join(', ')}
            </p>
          )}
          {office.registration_phone && (
            <p className="text-xs text-muted">Reg phone: {office.registration_phone}</p>
          )}
          {office.registration_url_direct && (
            <p className="text-xs text-muted truncate">
              Reg URL: {office.registration_url_direct}
            </p>
          )}
          {officeReturnAddress(office) && (
            <p className="text-xs text-muted whitespace-pre-line mt-0.5">
              Return: {officeReturnAddress(office)}
            </p>
          )}
        </div>
      )}

      {(client.description || (admin && client.notes)) && (
        <div>
          <p className="label mb-1">
            Notes
          </p>
          {client.description && <p className="text-xs">{client.description}</p>}
          {admin && client.notes && <p className="text-xs text-muted mt-1">{client.notes}</p>}
        </div>
      )}
    </Card>
  )
}

/**
 * `mailer_return_address` is jsonb; the importer stored the raw CSV
 * cell under a `freeform` key. Returns null when absent so the row hides.
 */
function officeReturnAddress(office: NonNullable<OfficeLite>): string | null {
  const a = office.mailer_return_address
  if (a && typeof a === 'object' && 'freeform' in a) {
    const v = (a as { freeform?: unknown }).freeform
    if (typeof v === 'string' && v.trim()) return v
  }
  return null
}

function Dl({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
      {children}
    </dl>
  )
}
function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="text-muted">{children}</dt>
}
function Dd({ children }: { children: React.ReactNode }) {
  return (
    <dd className={children ? '' : 'text-muted'}>
      {children ?? '—'}
    </dd>
  )
}
