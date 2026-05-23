import Link from 'next/link'
import { adminListProfiles } from '@/lib/db/profiles'
import { formatEventDate } from '@/lib/utils/format'

/**
 * /admin/profiles — every signed-up user with their role + linked client.
 * Read-only for v1; assignment/role-flip UI is a fast follow.
 */
export default async function AdminProfilesPage() {
  const profiles = await adminListProfiles()

  const clientCount = profiles.filter((p) => p.role === 'client').length
  const adminCount = profiles.filter((p) => p.role === 'admin').length
  const unlinkedCount = profiles.filter(
    (p) => p.role === 'client' && !p.client_id
  ).length

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-medium">Profiles</h1>
        <p className="text-sm text-muted">
          {profiles.length} total · {adminCount} admin · {clientCount} client
          {unlinkedCount > 0 && (
            <span className="text-warning">
              {' '}
              · {unlinkedCount} client{unlinkedCount === 1 ? '' : 's'} not linked
            </span>
          )}
        </p>
      </header>

      {profiles.length === 0 ? (
        <p className="text-sm text-muted">No profiles yet.</p>
      ) : (
        <div className="border border-border rounded-lg bg-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Role</th>
                <th className="text-left px-4 py-2 font-medium">Client</th>
                <th className="text-left px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 font-mono text-xs">
                    {p.email ?? <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    {p.full_name ?? <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <RoleBadge role={p.role} />
                  </td>
                  <td className="px-4 py-2">
                    {p.client_id ? (
                      <Link
                        href={`/admin/clients/${p.client_id}`}
                        className="underline underline-offset-2"
                      >
                        {p.client_name ?? p.client_id.slice(0, 8)}
                      </Link>
                    ) : p.role === 'client' ? (
                      <span className="text-warning">not linked</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {p.created_at ? formatEventDate(p.created_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${
        isAdmin
          ? 'bg-accent/5 text-accent border-accent/20'
          : 'bg-bg text-ink border-border'
      }`}
    >
      {role}
    </span>
  )
}
