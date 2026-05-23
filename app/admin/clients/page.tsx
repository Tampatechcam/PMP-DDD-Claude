import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { adminListClients } from '@/lib/db/clients'

export default async function AdminClientsPage() {
  const clients = await adminListClients()

  const groupCount = clients.filter((c) => c.is_group).length

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="text-sm text-muted">
          {clients.length} total · {groupCount} group · {clients.length - groupCount} independent
        </p>
      </header>

      {clients.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center bg-surface">
          <p className="text-sm font-medium">No clients yet</p>
          <p className="text-xs text-muted mt-1">
            Once a client is added to the dictionary they’ll show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/clients/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-bg group transition-colors"
              >
                <div
                  className={`w-7 h-7 rounded grid place-items-center text-xs font-medium shrink-0 ${
                    c.is_group
                      ? 'bg-accent/5 text-accent border border-accent/20'
                      : 'bg-bg text-muted border border-border'
                  }`}
                  aria-hidden
                >
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted truncate">
                    {c.is_group ? 'Group' : 'Independent'}
                    {c.business_name && c.business_name !== c.name && ` · ${c.business_name}`}
                    {c.responsibility && ` · ${c.responsibility}`}
                  </p>
                </div>
                <Icon name="arrowRight" className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
