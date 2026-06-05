'use client'
import { Shell, type ShellNavItem } from './Shell'

/**
 * Admin shell sidebar. Delegates to the shared `<Shell>`, which owns
 * the responsive desktop-aside / mobile-drawer layout, the ⌘K command
 * palette, and the theme switcher. The only admin-specific logic that
 * lives here is the nav-item list + the "Overview / Past events" tab
 * matcher that decides which sidebar row counts as active when the URL
 * is `/admin?tab=past`.
 */

const nav: ShellNavItem[] = [
  {
    href: '/admin',
    label: 'Overview',
    icon: 'orders',
    isActive: (pathname, search) => pathname === '/admin' && search.get('tab') !== 'past'
  },
  {
    href: '/admin?tab=past',
    label: 'Past events',
    icon: 'orders',
    isActive: (pathname, search) => pathname === '/admin' && search.get('tab') === 'past'
  },
  { href: '/admin/clients',  label: 'Clients',  icon: 'clients' },
  { href: '/admin/orders',   label: 'Orders',   icon: 'orders' },
  { href: '/admin/invoices', label: 'Invoices', icon: 'invoices' },
  { href: '/admin/pricing',  label: 'Pricing',  icon: 'document' },
  { href: '/admin/profiles', label: 'Users',    icon: 'profiles' }
]

export function AdminSidebar() {
  return (
    <Shell
      navItems={nav}
      brandHref="/admin"
      brandLabel="Admin"
      paletteScope="admin"
    />
  )
}
