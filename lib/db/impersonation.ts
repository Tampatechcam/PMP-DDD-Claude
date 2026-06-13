import 'server-only'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { getMyProfile } from '@/lib/db/auth'

/**
 * Admin "view as client" impersonation.
 *
 * An admin can set a cookie naming a client_id; while it's set, the
 * client-facing pages (/orders, /venues, /account) scope their reads — and
 * order/venue creation — to that client instead of the admin's own (null)
 * client_id.
 *
 * SECURITY: the cookie is only ever honored when the signed-in user's profile
 * role is 'admin', re-checked server-side on every request here. A non-admin
 * who forges the cookie gets nothing — `getImpersonatedClientId` returns null
 * for them, so the data layer falls back to their own RLS-scoped client_id.
 * RLS remains the hard boundary: the policies allow `is_admin()` to read/write
 * any client's rows, which is exactly what makes the explicit client_id scoping
 * safe (and what stops everyone else).
 */
export const IMPERSONATION_COOKIE = 'pmp_view_client'

/**
 * The client_id an admin is currently viewing as, or null if the caller
 * isn't an admin or isn't impersonating. Memoized per request.
 */
export const getImpersonatedClientId = cache(async (): Promise<string | null> => {
  const profile = await getMyProfile()
  if (profile?.role !== 'admin') return null
  const value = cookies().get(IMPERSONATION_COOKIE)?.value
  return value && value.length > 0 ? value : null
})
