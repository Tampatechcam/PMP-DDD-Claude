import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root route — bounce based on role:
 *   signed out                 → /login
 *   signed in as admin         → /admin
 *   signed in as client (or
 *   profile not yet linked)    → /orders
 */
export default async function Root() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'admin') redirect('/admin')
  redirect('/orders')
}
