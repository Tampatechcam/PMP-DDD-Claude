import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Per-request memoized auth lookups.
 *
 * Without `cache()`, each Server Component that calls `supabase.auth.getUser()`
 * fires its own `/auth/v1/user` request. A single page render that hits the
 * layout (auth check) + the page (auth-aware query) was doing TWO round-trips
 * just to learn who the user is. `cache()` collapses them into one per
 * request — the layout's call hits Supabase, the page's call reads the
 * memoized result.
 *
 * `cache()` only lives for the duration of a server render, so there's no
 * cross-request leak. RLS is still the security boundary; this is purely a
 * perf wrapper.
 */
export const getAuthUser = cache(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/**
 * Like getAuthUser but throws if not signed in. Layouts have already gated
 * (redirected to /login) before any page renders that need a logged-in user,
 * so failing loudly here is fine.
 */
export const requireAuthUser = cache(async () => {
  const user = await getAuthUser()
  if (!user) throw new Error('Not signed in')
  return user
})

/**
 * The signed-in user's profile row (or null). Joined with role so the layouts'
 * admin check is one query, not user-then-profile two-step.
 */
export const getMyProfile = cache(async () => {
  const user = await getAuthUser()
  if (!user) return null
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, client_id, full_name')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw error
  return data
})
