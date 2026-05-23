/**
 * Status helpers. The string values come from orders_with_display_status,
 * so the only thing left for the UI is mapping a string -> color.
 */

export type DisplayStatus =
  | 'Submitted'
  | 'In Production'
  | 'Ready to Send'
  | 'Completed'
  | 'Awaiting Your Approval'
  | 'Revision Requested'

export function statusTone(s: string | null | undefined):
  'neutral' | 'success' | 'warning' | 'danger' {
  switch (s) {
    case 'Completed': return 'success'
    case 'In Production':
    case 'Ready to Send': return 'neutral'
    case 'Awaiting Your Approval': return 'warning'
    case 'Revision Requested': return 'danger'
    default: return 'neutral'
  }
}
