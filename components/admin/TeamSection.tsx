import { adminListTeamForClient } from '@/lib/db/profiles'
import { InviteUserForm } from './InviteUserForm'
import { ResendInviteButton } from './ResendInviteButton'
import { formatEventDate } from '@/lib/utils/format'

interface Props {
  client: { id: string; name: string }
}

/**
 * Per-client Team section: lists every profile linked to this client plus
 * an invite form scoped to it. The "Resend invite" button only shows for
 * users who haven't accepted yet (email_confirmed_at is null).
 *
 * Data layer (profile + auth.users email join) lives in
 * lib/db/profiles.ts so this component stays presentational.
 */
export async function TeamSection({ client }: Props) {
  const members = await adminListTeamForClient(client.id)
  const team = members.map((m) => ({
    id: m.id,
    full_name: m.full_name,
    role: m.role,
    email: m.email,
    confirmed: !!m.email_confirmed_at,
    last_sign_in_at: m.last_sign_in_at,
    created_at: m.created_at
  }))

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Team ({team.length})</h2>

      {team.length === 0 ? (
        <p className="text-sm text-muted">
          No team members yet — invite someone below.
        </p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg bg-surface">
          {team.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.full_name ?? m.email ?? '—'}
                </p>
                <p className="text-xs text-muted font-mono truncate">
                  {m.email ?? '—'}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {m.confirmed
                    ? m.last_sign_in_at
                      ? `Active · last signed in ${formatEventDate(m.last_sign_in_at)}`
                      : 'Active'
                    : 'Invited · waiting for first sign-in'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${
                    m.role === 'admin'
                      ? 'bg-accent/5 text-accent border-accent/20'
                      : 'bg-bg text-ink border-border'
                  }`}
                >
                  {m.role}
                </span>
                {!m.confirmed && <ResendInviteButton userId={m.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}

      <InviteUserForm
        clients={[client]}
        defaultClientId={client.id}
        lockRoleClient
      />
    </section>
  )
}
