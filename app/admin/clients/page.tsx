import Link from 'next/link'
import { adminListClients } from '@/lib/db/clients'

export default async function AdminClientsPage() {
  const clients = await adminListClients()

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-medium">Clients</h1>
        <p className="text-sm text-muted">
          {clients.length} client{clients.length === 1 ? '' : 's'} total.
        </p>
      </header>

      {clients.length === 0 ? (
        <p className="text-sm text-muted">No clients yet.</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg bg-surface">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/clients/${c.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted truncate">
                    {c.is_group ? 'Group' : 'Independent'}
                    {c.business_name && c.business_name !== c.name && ` · ${c.business_name}`}
                    {c.responsibility && ` · ${c.responsibility}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
