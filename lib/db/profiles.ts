import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * The session's profile row. Used by mutating actions that need to know the
 * caller's client_id (e.g. venue creation, order creation) up-front so the
 * insert satisfies the RLS with-check.
 *
 * Returns null only when the caller isn't signed in — layouts already gate
 * for that, so most callers can `if (!profile) throw` safely.
 */
export async function getCurrentProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, client_id, full_name')
    .eq('id', user.id)
    .single()
  if (error) throw error
  return data
}

/**
 * Convenience: just the client_id, since most callers only need that.
 * Throws if the profile has no client_id linked — that's a setup problem,
 * not a user-facing condition.
 */
export type AdminProfileRow = {
  id: string
  full_name: string | null
  role: 'client' | 'admin' | string
  created_at: string | null
  email: string | null
  client_id: string | null
  client_name: string | null
}

/**
 * Admin: every profile in the system with its linked client name. RLS is
 * permissive for admins (`profiles_select` + `profiles_admin_write`) but
 * the email lives on auth.users which RLS does NOT govern from the data
 * API — we use the service-role admin client just for the email join,
 * then merge in JS. Cheap: this list is small.
 */
export async function adminListProfiles(): Promise<AdminProfileRow[]> {
  const supabase = createClient()
  const { data: profileRows, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at, client_id, clients ( name )')
    .order('created_at', { ascending: false })
  if (error) throw error

  // Pull emails via the service-role admin client (server-only, gated by
  // the page-level admin check that's already in /admin/layout.tsx).
  const { supabaseAdmin } = await import('@/lib/supabase/admin')
  const { data: users } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200
  })
  const emailById = new Map<string, string | undefined>(
    users?.users.map((u) => [u.id, u.email]) ?? []
  )

  return (profileRows ?? []).map((p) => {
    // The generated type widens the single-FK relationship to an array
    // (`{ name: string }[]`) because PostgREST returns it ambiguously.
    // At runtime it's either an object or null, so handle both.
    const raw = (p as { clients?: { name: string } | { name: string }[] | null }).clients
    const linked = Array.isArray(raw) ? raw[0] : raw
    return {
      id: p.id,
      full_name: p.full_name,
      role: p.role,
      created_at: p.created_at,
      email: emailById.get(p.id) ?? null,
      client_id: p.client_id,
      client_name: linked?.name ?? null
    }
  })
}

export async function getCurrentClientIdOrThrow(): Promise<string> {
  const profile = await getCurrentProfile()
  if (!profile?.client_id) {
    throw new Error(
      'Your profile is not linked to a client. Ask an admin to link your account.'
    )
  }
  return profile.client_id
}
