/**
 * Status helpers. The string values come from orders_with_display_status,
 * which now prefers the raw Direct Mail Sheet status — so the UI sees the
 * exact phrasing the ops team uses ("All Details Added, Pending Details",
 * "Order Sent", "Complete"). statusTone() maps each one to one of four
 * tones the StatusPill renders.
 */

export type Tone = 'neutral' | 'success' | 'warning' | 'danger'

export function statusTone(s: string | null | undefined): Tone {
  if (!s) return 'neutral'
  const v = s.toLowerCase()

  // Client-facing proof states first.
  if (v.includes('revision')) return 'danger'
  if (v.includes('awaiting')) return 'warning'

  // Terminal states.
  if (v.includes('complete') || v.includes('completed')) return 'success'

  // Anything explicitly "pending" leans warning so it draws the eye.
  if (v.includes('pending')) return 'warning'

  // "Order Sent", "All Details Added", "Ready to Send", etc.
  return 'neutral'
}
