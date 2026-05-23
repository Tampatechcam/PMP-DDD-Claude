import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Admin layout guard. Non-admin signed-in users get bounced to /orders;
 * signed-out users go to /login.
 *
 * This is defense-in-depth — RLS already prevents an authenticated client
 * from reading another client's data, so the UI guard is for navigation only.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/orders')

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
