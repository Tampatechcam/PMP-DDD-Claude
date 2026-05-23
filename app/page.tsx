import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root route — bounce to login if signed out, to the client home if signed in.
 * Admin role lands on (admin) via its own layout guard.
 */
export default async function Root() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  redirect('/orders')
}
