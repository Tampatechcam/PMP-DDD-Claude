import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

/** Vercel-only telemetry; no-op on Netlify and other hosts. */
export function VercelTelemetry() {
  if (!process.env.VERCEL) return null
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
