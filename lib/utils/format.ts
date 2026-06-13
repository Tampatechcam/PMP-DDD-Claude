/**
 * Display formatters. Pure functions only — no React, no IO.
 */

/**
 * URL slug for an order. Digital-only orders use their DIG-NNN
 * display_ref; DM orders fall back to the integer order_number.
 */
export function orderHref(
  o: { display_ref?: string | null; order_number: number },
  basePath = '/orders'
): string {
  return `${basePath}/${o.display_ref ?? o.order_number}`
}

/**
 * Human label for an order. "DIG-001" or "#651" — the prefix differs
 * so it's obvious to ops which sheet the row came from.
 */
export function orderLabel(
  o: { display_ref?: string | null; order_number: number }
): string {
  return o.display_ref ?? `#${o.order_number}`
}

export function formatEventDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatRelativeDate(
  d: string | Date | null | undefined
): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  // Anchor on day boundaries (UTC-stable) so "in 0 days" is "today".
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  if (diff > 1 && diff < 14) return `in ${diff} days`
  if (diff < -1 && diff > -14) return `${-diff} days ago`
  return ''
}

export function formatMoney(n: number | null | undefined): string {
  if (n == null) return ''
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function formatQuantity(n: number | null | undefined): string {
  if (n == null) return ''
  return n.toLocaleString('en-US')
}

/**
 * 18:00:00 → "6:00 PM", 09:30 → "9:30 AM". Accepts Postgres time strings.
 * Returns "" for bad input rather than throwing — display path.
 */
export function formatTime(t: string | null | undefined): string {
  if (!t) return ''
  const m = /^(\d{1,2}):(\d{2})/.exec(t)
  if (!m) return t
  let hh = Number(m[1])
  const mm = Number(m[2])
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return t
  const period = hh >= 12 ? 'PM' : 'AM'
  hh = hh % 12
  if (hh === 0) hh = 12
  const mmStr = mm === 0 ? '' : `:${mm.toString().padStart(2, '0')}`
  return `${hh}${mmStr} ${period}`
}

export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  const s = formatTime(start)
  const e = formatTime(end)
  if (s && e) return `${s} – ${e}`
  return s || e || ''
}
