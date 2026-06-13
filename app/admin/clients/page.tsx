import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { adminListClients, adminOrderCountsByClient } from '@/lib/db/clients'
import { adminListAllOffices } from '@/lib/db/offices'

/**
 * /admin/clients — collapsible Groups + compact Independent list.
 *
 * Three parallel reads (clients, offices, order counts) issued together
 * so the page renders in one round-trip. Groups render as native
 * <details> elements (collapsed by default) — no client JS needed, the
 * chevron rotates via Tailwind's `group-open` variant.
 */
export default async function AdminClientsPage() {
  const [clients, allOffices, orderCounts] = await Promise.all([
    adminListClients(),
    adminListAllOffices(),
    adminOrderCountsByClient()
  ])

  // Index offices by client_id once for O(1) lookup per group card.
  const officesByClient = new Map<string, typeof allOffices>()
  for (const o of allOffices) {
    const arr = officesByClient.get(o.client_id) ?? []
    arr.push(o)
    officesByClient.set(o.client_id, arr)
  }

  const groups = clients.filter((c) => c.is_group)
  const independents = clients.filter((c) => !c.is_group)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="text-sm text-muted">
          {clients.length} total · {groups.length} group · {independents.length} independent
        </p>
      </header>

      {/* ── Groups (collapsible) ───────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Groups · {groups.length}
        </h2>
        {groups.length === 0 ? (
          <EmptyState title="No group clients yet" />
        ) : (
          <ul className="space-y-2">
            {groups.map((c) => (
              <GroupCard
                key={c.id}
                id={c.id}
                name={c.name}
                businessName={c.business_name}
                offices={officesByClient.get(c.id) ?? []}
                orderCount={orderCounts[c.id] ?? 0}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ── Independent clients (compact) ───────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Independent · {independents.length}
        </h2>
        {independents.length === 0 ? (
          <EmptyState title="No independent clients yet" />
        ) : (
          <ul className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
            {independents.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/clients/${c.id}`}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-bg group transition-colors"
                >
                  <Avatar name={c.name} tone="muted" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {(c.business_name && c.business_name !== c.name) || c.responsibility ? (
                      <p className="text-xs text-muted truncate">
                        {[c.business_name && c.business_name !== c.name ? c.business_name : null, c.responsibility]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted tabular-nums shrink-0">
                    {orderCounts[c.id] ?? 0}
                  </span>
                  <Icon
                    name="arrowRight"
                    className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}

function GroupCard({
  id,
  name,
  businessName,
  offices,
  orderCount
}: {
  id: string
  name: string
  businessName: string | null
  offices: { id: string; name: string; state: string | null }[]
  orderCount: number
}) {
  return (
    <li>
      <details className="group/d border border-border rounded-lg bg-surface overflow-hidden">
        <summary className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-bg select-none list-none">
          {/* Chevron — rotates 90° when <details open> via Tailwind group-open named-group */}
          <span
            aria-hidden
            className="text-muted text-xs leading-none w-3 inline-block transition-transform group-open/d:rotate-90"
          >
            ▶
          </span>
          <Avatar name={name} tone="accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-xs text-muted truncate">
              {offices.length} office{offices.length === 1 ? '' : 's'}
              {' · '}
              {orderCount} order{orderCount === 1 ? '' : 's'}
              {businessName && businessName !== name && ` · ${businessName}`}
            </p>
          </div>
        </summary>

        <div className="border-t border-border">
          {offices.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted bg-bg">
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 font-medium">Office</th>
                  <th className="text-left px-3 py-2 font-medium w-16">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {offices.map((o) => (
                  <tr key={o.id} className="hover:bg-bg transition-colors">
                    <td className="px-3 py-1.5">{o.name}</td>
                    <td className="px-3 py-1.5 text-muted">
                      {o.state ?? <span className="text-muted/60">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-3 py-2 text-xs text-muted italic">No offices yet.</p>
          )}
          <div className="px-3 py-1.5 border-t border-border bg-bg/50">
            <Link
              href={`/admin/clients/${id}`}
              className="text-xs underline underline-offset-2 text-muted hover:text-ink"
            >
              View client →
            </Link>
          </div>
        </div>
      </details>
    </li>
  )
}

// Avatar + initials() moved to components/ui/Avatar.tsx; EmptyHint
// replaced by the shared <EmptyState> primitive (components/ui/EmptyState.tsx).
