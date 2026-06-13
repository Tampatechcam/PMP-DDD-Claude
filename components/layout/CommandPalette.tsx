'use client'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Kbd } from '@/components/ui/Kbd'
import { Avatar } from '@/components/ui/Avatar'
import { searchEverything, type PaletteHit } from '@/lib/actions/search'
import type { ShellNavItem } from './Shell'

/**
 * Global Command Palette — opens with ⌘K / Ctrl-K, or via the search
 * button in the sidebar / mobile top bar.
 *
 * What it does:
 *   • Always shows the current shell's nav items as quick-jump rows.
 *   • Debounces the query to the `searchEverything` server action; that
 *     action handles RLS and impersonation, so the palette is safe to
 *     mount from either the admin or client shell.
 *   • Up/Down + Enter to choose, Esc to close.
 *
 * The palette renders nothing while `open === false` so there's no DOM
 * cost for the 99% of time it isn't visible.
 */

export type PaletteScope = 'admin' | 'client'

interface Props {
  open: boolean
  onClose: () => void
  scope: PaletteScope
  navItems: ShellNavItem[]
}

interface BaseRow {
  key: string
  href: string
  label: string
  subtitle?: string | null
  group: 'navigation' | 'clients' | 'orders'
}

export function CommandPalette({ open, onClose, scope, navItems }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<PaletteHit[]>([])
  const [highlight, setHighlight] = useState(0)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset on open. We re-focus the input every time it's shown so the
  // ⌘K-twice-in-a-row workflow always lands the caret in the field.
  useEffect(() => {
    if (open) {
      setQuery('')
      setHits([])
      setHighlight(0)
      // setTimeout punts past the same-tick keyboard handler that opened us.
      const t = window.setTimeout(() => inputRef.current?.focus(), 10)
      return () => window.clearTimeout(t)
    }
    return
  }, [open])

  // Debounced search. Triggered when the query changes; only ships
  // queries of 2+ chars to keep the round-trip count down.
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      return
    }
    const t = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const results = await searchEverything(q, scope)
          setHits(results)
          setHighlight(0)
        } catch {
          setHits([])
        }
      })
    }, 180)
    return () => window.clearTimeout(t)
  }, [query, open, scope])

  const rows: BaseRow[] = useMemo(() => {
    const navRows: BaseRow[] = navItems.map((n) => ({
      key: `nav:${n.href}:${n.label}`,
      href: n.href,
      label: n.label,
      group: 'navigation'
    }))
    const filteredNav = query.trim().length === 0
      ? navRows
      : navRows.filter((r) => r.label.toLowerCase().includes(query.trim().toLowerCase()))

    const hitRows: BaseRow[] = hits.map((h) =>
      h.kind === 'client'
        ? { key: `client:${h.id}`, href: h.href, label: h.name, subtitle: h.subtitle, group: 'clients' }
        : { key: `order:${h.id}`,  href: h.href, label: h.label, subtitle: h.subtitle, group: 'orders' }
    )

    return [...filteredNav, ...hitRows]
  }, [navItems, hits, query])

  const choose = (row: BaseRow) => {
    onClose()
    router.push(row.href)
  }

  // Keyboard: Esc closes, ↑/↓ moves, Enter picks. Mod-K handled by Shell.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => Math.min(h + 1, Math.max(0, rows.length - 1)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => Math.max(h - 1, 0))
      } else if (e.key === 'Enter') {
        const row = rows[highlight]
        if (row) { e.preventDefault(); choose(row) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rows, highlight])

  if (!open) return null

  // Group rows for sectioned rendering without losing the flat `highlight` index.
  const groups: { label: string; iconName: IconName; rows: { row: BaseRow; index: number }[] }[] = []
  const groupDefs: { key: BaseRow['group']; label: string; iconName: IconName }[] = [
    { key: 'navigation', label: 'Jump to',   iconName: 'arrowRight' },
    { key: 'clients',    label: 'Clients',   iconName: 'clients' },
    { key: 'orders',     label: 'Orders',    iconName: 'orders' }
  ]
  for (const def of groupDefs) {
    const matches = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.group === def.key)
    if (matches.length > 0) groups.push({ label: def.label, iconName: def.iconName, rows: matches })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-[12vh] animate-fade-in"
    >
      <button
        type="button"
        aria-label="Close palette"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-xl bg-surface border border-border rounded-lg shadow-2xl shadow-black/10 overflow-hidden animate-slide-up">
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Icon name="search" className="w-4 h-4 text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={scope === 'admin' ? 'Search clients, orders, pages…' : 'Search your orders or jump to a page…'}
            className="flex-1 bg-transparent text-sm py-1 outline-none placeholder:text-muted"
          />
          {pending && <span className="text-[10px] text-muted">…</span>}
          <Kbd>Esc</Kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
          {groups.length === 0 ? (
            <EmptyHint query={query} pending={pending} />
          ) : (
            groups.map((g) => (
              <div key={g.label} className="py-1.5">
                <div className="px-3 pt-1.5 pb-1 label flex items-center gap-1.5">
                  <Icon name={g.iconName} className="w-3 h-3" />
                  {g.label}
                </div>
                {g.rows.map(({ row, index }) => (
                  <PaletteRow
                    key={row.key}
                    row={row}
                    active={highlight === index}
                    onPick={() => choose(row)}
                    onHover={() => setHighlight(index)}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        <div className="px-3 py-2 border-t border-border text-[11px] text-muted flex items-center gap-3 bg-bg/50">
          <span className="inline-flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
          <span className="inline-flex items-center gap-1"><Kbd>↵</Kbd> open</span>
          <span className="ml-auto inline-flex items-center gap-1"><Kbd>⌘K</Kbd> toggle</span>
        </div>
      </div>
    </div>
  )
}

function EmptyHint({ query, pending }: { query: string; pending: boolean }) {
  const trimmed = query.trim()
  if (pending) return <div className="px-3 py-6 text-center text-xs text-muted">Searching…</div>
  if (trimmed.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-xs text-muted">
        Type to search clients, orders, or jump to a page.
      </div>
    )
  }
  if (trimmed.length < 2) {
    return (
      <div className="px-3 py-6 text-center text-xs text-muted">
        Keep typing — at least 2 characters.
      </div>
    )
  }
  return (
    <div className="px-3 py-6 text-center text-xs text-muted">
      No matches for “{trimmed}”.
    </div>
  )
}

function PaletteRow({
  row,
  active,
  onPick,
  onHover
}: {
  row: BaseRow
  active: boolean
  onPick: () => void
  onHover: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={onHover}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
        active ? 'bg-bg' : 'hover:bg-bg/60'
      }`}
    >
      {row.group === 'clients' ? (
        <Avatar name={row.label} size="sm" tone="accent" />
      ) : row.group === 'orders' ? (
        <span className="shrink-0 w-6 h-6 rounded grid place-items-center bg-bg border border-border text-muted">
          <Icon name="orders" className="w-3.5 h-3.5" />
        </span>
      ) : (
        <span className="shrink-0 w-6 h-6 rounded grid place-items-center bg-bg border border-border text-muted">
          <Icon name="arrowRight" className="w-3.5 h-3.5" />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-ink truncate">{row.label}</span>
        {row.subtitle && (
          <span className="block text-xs text-muted truncate">{row.subtitle}</span>
        )}
      </span>
      <Icon name="arrowRight" className={`w-3.5 h-3.5 transition-opacity ${active ? 'opacity-70' : 'opacity-0'}`} />
    </button>
  )
}
