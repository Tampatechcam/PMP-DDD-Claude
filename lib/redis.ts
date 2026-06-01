import { Redis } from '@upstash/redis'

/**
 * Upstash Redis client — env vars `KV_REST_API_URL` and `KV_REST_API_TOKEN`
 * are auto-provisioned by `vercel integration add upstash`.
 *
 * Returns null when not configured (local dev without env pull).
 */
export function getRedis(): Redis | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null
  }
  return Redis.fromEnv()
}

/** Example: cache a dashboard summary keyed by client id. */
export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null
  return redis.get<T>(key)
}

export async function setCached<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  await redis.set(key, value, { ex: ttlSeconds })
}
