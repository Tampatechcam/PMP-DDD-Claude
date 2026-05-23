'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Brand } from './Brand'
import { Icon, type IconName } from '@/components/ui/Icon'
import { signOut } from '@/lib/actions/auth'

interface NavItem {
  href: string
  label: string
  icon: IconName
  /** Match this rule: `pathname` (default) or `pathname-and-tab`. */
  match?: 'pathname' | 'pathname-and-tab-past' | 'pathname-no-tab'
}

const nav: NavItem[] = [
  { href: '/admin',             label: 'Overview',    icon: 'orders',   match: 'pathname-no-tab' },
  { href: '/admin?tab=past',    label: 'Past events', icon: 'orders',   match: 'pathname-and-tab-past' },
  { href: '/admin/clients',     label: 'Clients',     icon: 'clients' },
  { href: '/admin/orders',      label: 'Orders',      icon: 'orders' },
  { href: '/admin/invoices',    label: 'Invoices',    icon: 'invoices' },
  { href: '/admin/profiles',    label: 'Profiles',    icon: 'profiles' }
]

export function AdminSidebar() {
  const pathname = usePathname()
  const search = useSearchParams()
  const tab = search.get('tab')

  const isActive = (item: NavItem) => {
    if (item.match === 'pathname-and-tab-past') {
      return pathname === '/admin' && tab === 'past'
    }
    if (item.match === 'pathname-no-tab') {
      return pathname === '/admin' && tab !== 'past'
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-surface flex flex-col">
      <div className="p-4 border-b border-border">
        <Brand href="/admin" label="Admin" />
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
              isActive(item)
                ? 'bg-bg text-ink font-medium'
                : 'text-muted hover:bg-bg hover:text-ink'
            }`}
          >
            <Icon name={item.icon} className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <form action={signOut} className="p-2 border-t border-border">
        <button
          type="submit"
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-muted hover:bg-bg hover:text-ink transition-colors"
        >
          <Icon name="signOut" className="w-4 h-4" />
          Sign out
        </button>
      </form>
    </aside>
  )
}
