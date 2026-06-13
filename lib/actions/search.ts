'use server'
import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from '@/lib/db/auth'
import { getImpersonatedClientId } from '@/lib/db/impersonation'

/**
 * Search results for the Command Palette (⌘K). Returns a small mixed
 * list of clients + orders matching the query. Server action so the
 * client component doesn't need to embed Supabase keys or duplicate
 * RLS / impersonation logic — those live in the existing db helpers.
 *
 * Scope:
 *   - 'admin'  → cross-client lookup (RLS lets admins read everything).
 *   - 'client' → scoped to the caller's client (or the impersonated
 *                client when an admin is "viewing as").
 *
 * Cap at MAX_RESULTS so a wide query ("a") doesn't ship the whole table.
 */

const MAX_RESULTS = 20

export type PaletteHit =
  | { kind: 'client'; id: string; name: string; subtitle: string | null; href: string }
  | { kind: 'order';  id: string; label: string; subtitle: string | null; href: string }

export async function searchEverything(
  query: string,
  scope: 'admin' | 'client'
): Promise<PaletteHit[]> {
  const q = query.trim()
  if (!q) return []

  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return []

  const isAdminSearch = scope === 'admin' && profile.role === 'admin'
  const impersonatedId = await getImpersonatedClientId()

  const term = `%${q}%`
  const hits: PaletteHit[] = []

  let q1 = supabase
    .from('orders_with_display_status')
    .select('id, order_number, display_ref, advisor_name, job_name, market, class_type, event_1_date, client_id')
    .order('event_1_date', { ascending: false, nullsFirst: false })
    .limit(12)

  const asNum = /^\d+$/.test(q) ? Number(q) : null
  const orParts: string[] = [
    `job_name.ilike.${term}`,
    `market.ilike.${term}`,
    `advisor_name.ilike.${term}`,
    `display_ref.ilike.${term}`
  ]
  if (asNum !== null) orParts.unshift(`order_number.eq.${asNum}`)
  q1 = q1.or(orParts.join(','))

  if (!isAdminSearch && impersonatedId) {
    q1 = q1.eq('client_id', impersonatedId)
  }

  if (isAdminSearch) {
    const [{ data: clients }, { data: orders }] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name, business_name, responsibility')
        .or(`name.ilike.${term},business_name.ilike.${term}`)
        .order('name')
        .limit(8),
      q1
    ])
    for (const c of clients ?? []) {
      const subtitle = c.business_name && c.business_name !== c.name
        ? c.business_name
        : c.responsibility
      hits.push({
        kind: 'client',
        id: c.id as string,
        name: c.name as string,
        subtitle: subtitle as string | null,
        href: `/admin/clients/${c.id}`
      })
    }
    appendOrderHits(hits, orders, '/admin/orders')
  } else {
    const { data: orders } = await q1
    appendOrderHits(hits, orders, '/orders')
  }

  return hits.slice(0, MAX_RESULTS)
}

function appendOrderHits(
  hits: PaletteHit[],
  orders: Record<string, unknown>[] | null,
  ordersBase: string
) {
  for (const o of orders ?? []) {
    const label = (o.display_ref as string | null) ?? `#${o.order_number}`
    const subtitleParts = [
      o.class_type,
      o.advisor_name,
      o.market,
      o.event_1_date
    ].filter(Boolean)
    hits.push({
      kind: 'order',
      id: o.id as string,
      label,
      subtitle: subtitleParts.join(' · ') || null,
      href: `${ordersBase}/${(o.display_ref as string | null) ?? o.order_number}`
    })
  }
}
