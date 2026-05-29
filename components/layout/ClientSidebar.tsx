'use client'
import { Shell, type ShellNavItem } from './Shell'

/**
 * Client portal sidebar. Thin wrapper around the shared `<Shell>`. The
 * desktop aside, mobile drawer, command palette, and theme toggle all
 * live in Shell — this file just supplies the role-specific routes.
 */

const nav: ShellNavItem[] = [
  { href: '/orders',  label: 'Orders',  icon: 'orders' },
  { href: '/venues',  label: 'Venues',  icon: 'venues' },
  { href: '/account', label: 'Account', icon: 'account' }
]

export function ClientSidebar() {
  return (
    <Shell
      navItems={nav}
      brandHref="/orders"
      paletteScope="client"
    />
  )
}
