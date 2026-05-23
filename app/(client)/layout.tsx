import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Client layout guard. Anyone not signed in goes to /login. Admins still see
 * client pages (they may want to view a client's experience), but their own
 * shell is /(admin).
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen">
      {/* Sidebar + office switcher land here (Day 4). */}
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
