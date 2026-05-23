import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

/**
 * Admin shell, mounted at /admin. We deliberately avoid the `(admin)` route
 * group from the plan because it would collide with `(client)/orders/*` —
 * route groups don't add a URL prefix, so the two `orders/page.tsx` files
 * would resolve to the same path. The /admin prefix keeps things distinct.
 *
 * RLS already prevents an authenticated client from reading another client's
 * data, so this guard is for navigation only.
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
    <div className="min-h-screen flex">
      <AdminSidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
