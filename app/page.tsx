import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/db/auth'

/**
 * Root route — bounce based on role:
 *   signed out                 → /login
 *   signed in as admin         → /admin
 *   signed in as client (or
 *   profile not yet linked)    → /orders
 */
export default async function Root() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'admin') redirect('/admin')
  redirect('/orders')
  // Unreachable: every branch above throws NEXT_REDIRECT. We still return
  // JSX so Next emits a valid client-reference manifest entry for this
  // route — a pure-redirect page produces a 332-byte chunk with an
  // undefined `clientModules` slot, which then crashes
  // app-page.runtime.prod at request time on Netlify's Linux runtime
  // (Cannot read properties of undefined (reading 'clientModules')).
  return null
}
