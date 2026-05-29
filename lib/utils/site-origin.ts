import { headers } from 'next/headers'

/**
 * Origin for auth redirect URLs (magic link, invite email).
 * Order: request Host → explicit site URL → Netlify deploy URL → localhost.
 */
export function siteOrigin(): string {
  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`

  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')

  // Netlify sets URL (this deploy) and DEPLOY_PRIME_URL (production hostname).
  const netlify =
    process.env.DEPLOY_PRIME_URL ?? process.env.URL
  if (netlify) return netlify.replace(/\/$/, '')

  return 'http://localhost:3000'
}

/** Reject open redirects — only same-origin relative paths. */
export function safeNextPath(raw: string | null, fallback = '/orders'): string {
  const next = raw ?? fallback
  if (!next.startsWith('/') || next.startsWith('//')) return fallback
  return next
}
