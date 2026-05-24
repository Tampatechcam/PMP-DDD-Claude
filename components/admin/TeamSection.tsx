import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
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
 * Renders on the admin client detail page. The admin layout has already
 * gated for role=admin, so we can use the service-role client safely for
 * the email join (same pattern as lib/db/profiles.ts:adminListProfiles).
 */
export async function TeamSection({ client }: Props) {
  const supabase = createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  const { data: users } = await supabaseAdmin.auth.admin.listUsers({
    page: 1, perPage: 200
  })
  const userById = new Map(users?.users.map((u) => [u.id, u]) ?? [])

  const team = (profiles ?? []).map((p) => {
    const u = userById.get(p.id)
    return {
      id: p.id,
      full_name: p.full_name,
      role: p.role as string,
      email: u?.email ?? null,
      confirmed: !!u?.email_confirmed_at,
      last_sign_in_at: u?.last_sign_in_at ?? null,
      created_at: p.created_at
    }
  })

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
