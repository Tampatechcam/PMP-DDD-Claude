import type { NextRequest } from 'next/server'
import { transformMiddlewareRequest } from '@axiomhq/nextjs'

/**
 * Edge-safe middleware logging — avoids importing @axiomhq/js in the Edge runtime.
 * HTTP/build logs also flow via the Axiom Vercel integration drains.
 */
export async function logMiddlewareRequest(request: NextRequest): Promise<void> {
  const endpoint = process.env.NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT
  const token = process.env.NEXT_PUBLIC_AXIOM_TOKEN
  const dataset = process.env.NEXT_PUBLIC_AXIOM_DATASET
  if (!endpoint || !token || !dataset) return

  const [message, report] = transformMiddlewareRequest(request)
  const payload = [
    {
      _time: new Date().toISOString(),
      source: 'middleware',
      message,
      ...report
    }
  ]

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
  } catch {
    // Best-effort — drains still capture platform HTTP logs when integration is installed.
  }
}
