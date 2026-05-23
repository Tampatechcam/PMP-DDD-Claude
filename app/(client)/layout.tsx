import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/auth/SignOutButton'

/**
 * Client layout guard. Anyone not signed in goes to /login. Admins still see
 * client pages (they may want to view a client's experience); their own shell
 * lives at /(admin).
 *
 * The header here is intentionally minimal — Sidebar + OfficeSwitcher land
 * on Day 4 (Part 10). For now: brand, account link, sign out.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/orders" className="text-sm font-medium">PMP</Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/orders" className="text-muted hover:text-ink">Orders</Link>
            <Link href="/venues" className="text-muted hover:text-ink">Venues</Link>
            <Link href="/account" className="text-muted hover:text-ink">Account</Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
