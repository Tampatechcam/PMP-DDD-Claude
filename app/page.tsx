import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/db/auth'

// Never statically prerender `/`. A prerendered root-redirect page crashes
// Netlify's Linux runtime with "Cannot read properties of undefined (reading
// 'clientModules')" (a Next 14.2.x route-manifest bug) — reproduced locally when
// this is absent. This page already reads cookies via getMyProfile() (→ dynamic),
// but the explicit flag makes that guarantee durable. NOTE: this build-fix is
// independent of the realtime feature; it is required for the Netlify build.
// (`middleware.ts` redirects `/` at the edge before this ever renders anyway.)
export const dynamic = 'force-dynamic'

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
