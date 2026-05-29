import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

/**
 * Compact, server-side filter chips for /admin/orders. Each active
 * query-string parameter shows up as a clickable chip — clicking the
 * × on the chip points to the same URL with that parameter dropped.
 *
 * Server-friendly: we just build URL strings and let `<Link>` handle
 * the navigation, so the form-driven filter bar above doesn't need
 * any "remove individual filter" client logic.
 */

export interface FilterChip {
  /** Query-string key (e.g. "client", "status", "needs"). */
  key: string
  /** Short prefix shown in the chip ("Client"). */
  label: string
  /** Pretty value (resolved name when key is an id). */
  value: string
}

interface Props {
  /** All currently-active filters, in display order. */
  chips: FilterChip[]
  /** Base path (e.g. "/admin/orders") used to build "remove" URLs. */
  basePath: string
  /** Current query state — used to compute each chip's "remove me" URL. */
  current: Record<string, string | undefined>
}

export function FilterChips({ chips, basePath, current }: Props) {
  if (chips.length === 0) return null

  const buildHrefWithout = (key: string) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(current)) {
      if (k === key) continue
      if (v) params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-muted font-medium mr-1">
        Filters
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs rounded-full border border-accent/20 bg-accent/5 text-accent"
        >
          <span className="font-medium">{chip.label}:</span>
          <span className="truncate max-w-[16rem]">{chip.value}</span>
          <Link
            href={buildHrefWithout(chip.key)}
            aria-label={`Remove ${chip.label} filter`}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full text-accent/70 hover:text-accent hover:bg-accent/10 transition-colors"
          >
            <Icon name="x" className="w-3 h-3" />
          </Link>
        </span>
      ))}
      <Link
        href={basePath}
        className="text-xs underline underline-offset-2 text-muted hover:text-ink ml-1"
      >
        Clear all
      </Link>
    </div>
  )
}
