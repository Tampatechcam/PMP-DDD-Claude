/**
 * Display formatters. Pure functions only — no React, no IO.
 */

export function formatEventDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

export function formatMoney(n: number | null | undefined): string {
  if (n == null) return ''
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function formatQuantity(n: number | null | undefined): string {
  if (n == null) return ''
  return n.toLocaleString('en-US')
}
