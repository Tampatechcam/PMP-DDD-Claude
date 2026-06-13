'use client'
import dynamic from 'next/dynamic'
import { Suspense, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Brand } from './Brand'
import { Icon, type IconName } from '@/components/ui/Icon'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Kbd } from '@/components/ui/Kbd'
import { signOut } from '@/lib/actions/auth'
import type { PaletteScope } from './CommandPalette'

const CommandPalette = dynamic(
  () => import('./CommandPalette').then((m) => ({ default: m.CommandPalette })),
  { ssr: false, loading: () => null }
)

/**
 * Unified app shell. Replaces the two `<aside>` blocks that used to live
 * in AdminSidebar / ClientSidebar and adds:
 *   • a desktop sidebar (visible at `lg` and up) — same look as before
 *   • a mobile top bar (visible below `lg`) — hamburger + brand + ⌘K + theme
 *   • a left-drawer overlay opened from the hamburger
 *   • a global Command Palette (⌘K / Ctrl-K) for jump-to-anywhere navigation
 *   • a Theme switcher pinned to the sidebar footer
 *
 * Nav items are passed in by the wrapping sidebar component (AdminSidebar
 * or ClientSidebar) so role-specific routing logic stays out of the shell.
 */

export interface ShellNavItem {
  href: string
  label: string
  icon: IconName
  /** Pluggable match rule — overrides the default `startsWith` test. */
  isActive?: (pathname: string, search: URLSearchParams) => boolean
}

interface ShellProps {
  navItems: ShellNavItem[]
  brandHref: string
  brandLabel?: string
  /** Which records the ⌘K palette can search. */
  paletteScope: PaletteScope
  /** Optional extra block above the sign-out (e.g. impersonation note). */
  footerExtra?: ReactNode
}

export function Shell({ navItems, brandHref, brandLabel, paletteScope, footerExtra }: ShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteEverOpened, setPaletteEverOpened] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (paletteOpen) setPaletteEverOpened(true)
  }, [paletteOpen])

  // Global ⌘K / Ctrl-K. Captures before any input handler so it works
  // from inside the search field too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close drawer on route change so a tap on a nav item doesn't leave it open.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  const navBody = (
    <Suspense fallback={<NavBodyFallback items={navItems} pathname={pathname} onPaletteOpen={() => setPaletteOpen(true)} footerExtra={footerExtra} />}>
    <NavBody
      items={navItems}
      pathname={pathname}
      onPaletteOpen={() => setPaletteOpen(true)}
      footerExtra={footerExtra}
    />
    </Suspense>
  )

  return (
    <>
      {/* Desktop sidebar (lg+) ─────────────────────────────────── */}
      <aside className="hidden lg:flex w-56 shrink-0 border-r border-border bg-surface flex-col sticky top-0 h-screen">
        <div className="p-4 border-b border-border bg-gradient-to-b from-accent/[0.04] to-transparent">
          <Brand href={brandHref} label={brandLabel} />
        </div>
        {navBody}
      </aside>

      {/* Mobile top bar (below lg) ─────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="inline-flex items-center justify-center w-9 h-9 rounded text-muted hover:bg-bg hover:text-ink transition-colors focus-ring"
          >
            <Icon name="menu" className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <Brand href={brandHref} label={brandLabel} />
          </div>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open command palette"
            className="inline-flex items-center justify-center w-9 h-9 rounded text-muted hover:bg-bg hover:text-ink transition-colors focus-ring"
          >
            <Icon name="search" className="w-4 h-4" />
          </button>
          <ThemeToggle compact />
        </div>
      </div>

      {/* Mobile drawer ─────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex animate-fade-in">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <aside className="relative w-64 max-w-[80vw] bg-surface border-r border-border flex flex-col animate-slide-up">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <Brand href={brandHref} label={brandLabel} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="inline-flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-bg hover:text-ink focus-ring"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
            {navBody}
          </aside>
        </div>
      )}

      {paletteEverOpened && (
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          scope={paletteScope}
          navItems={navItems}
        />
      )}
    </>
  )
}


function NavBodyFallback(props: {
  items: ShellNavItem[]
  pathname: string
  onPaletteOpen: () => void
  footerExtra?: ReactNode
}) {
  return <NavBodyContent {...props} search={new URLSearchParams()} />
}

function NavBody({
  items,
  pathname,
  onPaletteOpen,
  footerExtra
}: {
  items: ShellNavItem[]
  pathname: string
  onPaletteOpen: () => void
  footerExtra?: ReactNode
}) {
  const search = useSearchParams()
  return (
    <NavBodyContent
      items={items}
      pathname={pathname}
      search={search}
      onPaletteOpen={onPaletteOpen}
      footerExtra={footerExtra}
    />
  )
}

function NavBodyContent({
  items,
  pathname,
  search,
  onPaletteOpen,
  footerExtra
}: {
  items: ShellNavItem[]
  pathname: string
  search: URLSearchParams
  onPaletteOpen: () => void
  footerExtra?: ReactNode
}) {
  return (
    <>
      <div className="px-2 pt-2">
        <button
          type="button"
          onClick={onPaletteOpen}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border border-border bg-bg/50 text-xs text-muted hover:bg-bg hover:text-ink transition-colors focus-ring"
        >
          <Icon name="search" className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {items.map((item) => {
          const active = item.isActive
            ? item.isActive(pathname, search)
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors focus-ring ${
                active
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-muted hover:bg-bg hover:text-ink'
              }`}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent"
                />
              )}
              <Icon
                name={item.icon}
                className={`w-4 h-4 transition-colors ${active ? 'text-accent' : 'text-muted/80 group-hover:text-ink'}`}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-2 space-y-0.5">
        {footerExtra}
        <ThemeToggle />
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-muted hover:bg-bg hover:text-ink transition-colors focus-ring"
          >
            <Icon name="signOut" className="w-4 h-4" />
            Sign out
          </button>
        </form>
      </div>
    </>
  )
}
