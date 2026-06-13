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
  neutral: 'bg-bg text-muted border-border',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger:  'bg-danger/10  text-danger  border-danger/25',
  accent:  'bg-accent/10  text-accent  border-accent/25'
}

const dotClasses: Record<PillTone, string> = {
  neutral: 'bg-muted ring-muted/20',
  success: 'bg-success ring-success/20',
  warning: 'bg-warning ring-warning/20',
  danger:  'bg-danger ring-danger/20',
  accent:  'bg-accent ring-accent/20'
}

interface PillProps {
  tone?: PillTone
  /** Show a leading colored dot. Defaults to false; pass `withDot` to match the original StatusPill. */
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
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium whitespace-nowrap border rounded-full ${toneClasses[tone]} ${className}`}
    >
      {withDot && <span className={`w-1.5 h-1.5 rounded-full ring-2 ${dotClasses[tone]}`} />}
      {children}
    </span>
  )
}
