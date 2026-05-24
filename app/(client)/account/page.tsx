import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { PasswordForm } from '@/components/auth/PasswordForm'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { getCurrentClientSelf } from '@/lib/db/clients'
import { listOfficesForCurrentClient } from '@/lib/db/offices'
import { getAuthUser } from '@/lib/db/auth'
import type { ReactNode } from 'react'

interface Props {
  searchParams: { error?: string; updated?: string }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0]!
  if (parts.length === 1) return first.slice(0, 2).toUpperCase()
  const last = parts[parts.length - 1]!
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
}

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function AccountPage({ searchParams }: Props) {
  const user = await getAuthUser()
  if (!user) return null

  const [client, offices] = await Promise.all([
    getCurrentClientSelf().catch(() => null),
    listOfficesForCurrentClient().catch(() => [] as Awaited<ReturnType<typeof listOfficesForCurrentClient>>),
  ])

  const displayName = client?.name ?? user.email ?? ''
  const initials = getInitials(displayName)
  const memberSince = user.created_at ? formatMemberSince(user.created_at) : null

  const hasBusinessDetails =
    client &&
    !!(
      client.business_name ||
      client.business_website ||
      client.ein ||
      client.default_mailer_type ||
      client.default_class_type ||
      client.default_mailing_quantity != null ||
      client.default_digital_budget != null
    )

  return (
    <section className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>

      {/* ── Profile ── */}
      <Card className="flex items-start gap-4">
        <div
          aria-hidden
          className="shrink-0 w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-base select-none"
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base leading-tight">{displayName}</span>
            <Pill tone="accent">Client</Pill>
          </div>
          {client?.business_name && (
            <p className="text-sm text-muted">{client.business_name}</p>
          )}
          <p className="text-xs text-muted">{user.email}</p>
          {memberSince && (
            <p className="text-xs text-muted/70">Member since {memberSince}</p>
          )}
        </div>
      </Card>

      {/* ── Business details ── */}
      {hasBusinessDetails && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="clients" className="w-4 h-4 text-muted" />
            <h2 className="text-sm font-medium">Business</h2>
          </div>
          <dl className="divide-y divide-border text-sm">
            {client!.business_name && (
              <InfoRow label="Business name" value={client!.business_name} />
            )}
            {client!.business_website && (
              <InfoRow
                label="Website"
                value={
                  <a
                    href={client!.business_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline break-all"
                  >
                    {client!.business_website.replace(/^https?:\/\//, '')}
                  </a>
                }
              />
            )}
            {client!.ein && <InfoRow label="EIN" value={client!.ein} />}
            {client!.default_mailer_type && (
              <InfoRow label="Default mailer" value={client!.default_mailer_type} />
            )}
            {client!.default_class_type && (
              <InfoRow label="Default class" value={client!.default_class_type} />
            )}
            {client!.default_mailing_quantity != null && (
              <InfoRow
                label="Mailing quantity"
                value={client!.default_mailing_quantity.toLocaleString()}
              />
            )}
            {client!.default_digital_budget != null && (
              <InfoRow
                label="Digital budget"
                value={`$${Number(client!.default_digital_budget).toLocaleString()}`}
              />
            )}
            {client!.is_non_profit && <InfoRow label="Non-profit" value="Yes" />}
          </dl>
        </Card>
      )}

      {/* ── Offices ── */}
      {offices.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="venues" className="w-4 h-4 text-muted" />
            <h2 className="text-sm font-medium">
              Offices
              <span className="text-muted font-normal ml-1.5">({offices.length})</span>
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {offices.map((office) => (
              <li key={office.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{office.name}</span>
                  {office.state && (
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-bg text-muted border border-border">
                      {office.state}
                    </span>
                  )}
                  {office.is_primary && <Pill tone="accent">Primary</Pill>}
                </div>
                {office.advisor_names && office.advisor_names.length > 0 && (
                  <p className="text-xs text-muted">{office.advisor_names.join(', ')}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {office.registration_phone && (
                    <a
                      href={`tel:${office.registration_phone}`}
                      className="text-xs text-muted hover:text-ink"
                    >
                      {office.registration_phone}
                    </a>
                  )}
                  {office.registration_url_direct && (
                    <a
                      href={office.registration_url_direct}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Direct registration
                    </a>
                  )}
                  {office.registration_url_digital && (
                    <a
                      href={office.registration_url_digital}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Digital registration
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Password ── */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="account" className="w-4 h-4 text-muted" />
          <h2 className="text-sm font-medium">Set or change password</h2>
        </div>
        <p className="text-sm text-muted">
          If you usually sign in with a magic link, set a password here so you
          don't need to fish a link out of your inbox every time.
        </p>
        <PasswordForm
          error={searchParams.error}
          updated={searchParams.updated === '1'}
        />
      </Card>

      {/* ── Sign out ── */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="signOut" className="w-4 h-4 text-muted" />
          <h2 className="text-sm font-medium">Sign out</h2>
        </div>
        <p className="text-sm text-muted">
          Ends this session on every device using this browser.
        </p>
        <SignOutButton />
      </Card>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex py-2 gap-4">
      <dt className="text-muted w-36 shrink-0">{label}</dt>
      <dd className="text-ink min-w-0">{value}</dd>
    </div>
  )
}
