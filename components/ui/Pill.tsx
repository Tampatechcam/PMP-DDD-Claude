import type { ReactNode } from 'react'

export type PillTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent'

/**
 * Tinted-background, bordered, rounded-full label. The single source of
 * truth for status-pill styling. Use `withDot` for the leading colored
 * dot (matches the original StatusPill).
 *
 * Stays inside the design system: muted backgrounds, no big color
 * blocks, 1px border.
 */
const toneClasses: Record<PillTone, string> = {
  neutral: 'bg-stone-100 text-stone-700 border-stone-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  danger:  'bg-rose-50 text-rose-800 border-rose-200',
  accent:  'bg-accent/5 text-accent border-accent/20'
}

const dotClasses: Record<PillTone, string> = {
  neutral: 'bg-stone-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-rose-500',
  accent:  'bg-accent'
}

interface PillProps {
  tone?: PillTone
  /** Show a leading colored dot. Defaults to true for backward compat with StatusPill. */
  withDot?: boolean
  className?: string
  children: ReactNode
}

export function Pill({
  tone = 'neutral',
  withDot = false,
  className = '',
  children
}: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-full ${toneClasses[tone]} ${className}`}
    >
      {withDot && <span className={`w-1.5 h-1.5 rounded-full ${dotClasses[tone]}`} />}
      {children}
    </span>
  )
}
