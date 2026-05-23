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
export async function getCurrentClientIdOrThrow(): Promise<string> {
  const profile = await getCurrentProfile()
  if (!profile?.client_id) {
    throw new Error(
      'Your profile is not linked to a client. Ask an admin to link your account.'
    )
  }
  return profile.client_id
}
