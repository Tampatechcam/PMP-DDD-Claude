import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from '@/lib/redis'

/**
 * Sliding-window rate limiter for Server Actions and route handlers.
 *
 * Example (invite flow):
 *   const limiter = getRateLimiter({ requests: 5, window: '1 m' })
 *   if (limiter) {
 *     const { success } = await limiter.limit(`invite:${adminId}`)
 *     if (!success) return { ok: false, error: 'Too many requests.' }
 *   }
 */
export function getRateLimiter(options: {
  requests: number
  window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`
}): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.requests, options.window),
    analytics: true,
    prefix: 'pmp'
  })
}
