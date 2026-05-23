import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/auth/SignOutButton'

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
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="text-sm font-medium">PMP · Admin</Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/admin/clients" className="text-muted hover:text-ink">Clients</Link>
            <Link href="/admin/orders" className="text-muted hover:text-ink">Orders</Link>
            <Link href="/admin/invoices" className="text-muted hover:text-ink">Invoices</Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
