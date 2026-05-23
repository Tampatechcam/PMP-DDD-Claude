'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brand } from './Brand'
import { Icon, type IconName } from '@/components/ui/Icon'
import { signOut } from '@/lib/actions/auth'

const nav: { href: string; label: string; icon: IconName }[] = [
  { href: '/admin',          label: 'Overview', icon: 'orders' },
  { href: '/admin/clients',  label: 'Clients',  icon: 'clients' },
  { href: '/admin/orders',   label: 'Orders',   icon: 'orders' },
  { href: '/admin/invoices', label: 'Invoices', icon: 'invoices' },
  { href: '/admin/profiles', label: 'Profiles', icon: 'profiles' }
]

export function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(`${href}/`)
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
              isActive(item.href)
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
