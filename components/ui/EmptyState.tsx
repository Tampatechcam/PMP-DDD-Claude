import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/**
 * Standard empty state. Used wherever a list / table returns zero rows.
 * Centralizes the dashed-border card + icon + title + description +
 * optional CTA layout that was reinvented (slightly differently each
 * time) in OrdersList, /admin/invoices, /admin/clients, etc.
 *
 * Server-safe by default — pass plain children for the CTA if you need
 * client interactivity.
 */
export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon?: IconName
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="border border-dashed border-border rounded-lg p-10 text-center bg-surface">
      {icon && (
        <div className="mx-auto mb-3 w-10 h-10 rounded-full grid place-items-center bg-bg text-muted">
          <Icon name={icon} className="w-5 h-5" />
        </div>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && (
        <p className="text-xs text-muted mt-1 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-4 inline-flex">{action}</div>}
    </div>
  )
}
