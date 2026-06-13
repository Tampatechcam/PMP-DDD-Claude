import type { ReactNode } from 'react'

/**
 * Rectangular bordered badge — the rectangular cousin of `<Pill>`. Used
 * for small metadata chips that shouldn't read as a status (e.g. the
 * `class_type` chip on order rows, the "Beta" tag on nav items).
 *
 * Stays inside the same tone palette as Pill so the two primitives feel
 * like one family.
 */
export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-bg text-muted border-border',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger:  'bg-danger/10  text-danger  border-danger/25',
  accent:  'bg-accent/10  text-accent  border-accent/25'
}

export function Badge({
  children,
  tone = 'neutral',
  className = ''
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-medium border rounded ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
