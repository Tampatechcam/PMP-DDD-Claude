'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brand } from './Brand'
import { Icon, type IconName } from '@/components/ui/Icon'
import { signOut } from '@/lib/actions/auth'

const nav: { href: string; label: string; icon: IconName }[] = [
  { href: '/orders',  label: 'Orders',  icon: 'orders' },
  { href: '/venues',  label: 'Venues',  icon: 'venues' },
  { href: '/account', label: 'Account', icon: 'account' }
]

export function ClientHeader() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Brand href="/orders" />
        <nav className="flex items-center gap-1 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                isActive(item.href)
                  ? 'bg-bg text-ink font-medium'
                  : 'text-muted hover:bg-bg hover:text-ink'
              }`}
            >
              <Icon name={item.icon} className="w-4 h-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
          <form action={signOut} className="ml-1">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-muted hover:bg-bg hover:text-ink transition-colors"
              title="Sign out"
            >
              <Icon name="signOut" className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </nav>
      </div>
    </header>
  )
}
