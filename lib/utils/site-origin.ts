import { headers } from 'next/headers'

/**
 * Origin for auth redirect URLs (magic link, invite email).
 * Prefer the request Host so preview/production/local all match where
 * the user actually signed in; fall back to NEXT_PUBLIC_SITE_URL.
 */
export function siteOrigin(): string {
  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  return 'http://localhost:3000'
}

/** Reject open redirects — only same-origin relative paths. */
export function safeNextPath(raw: string | null, fallback = '/orders'): string {
  const next = raw ?? fallback
  if (!next.startsWith('/') || next.startsWith('//')) return fallback
  return next
}
