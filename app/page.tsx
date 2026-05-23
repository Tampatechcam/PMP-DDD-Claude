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
}
