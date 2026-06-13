const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '1mb' }
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }]
  }
}

// Only wire withSentryConfig when a DSN is present. Without it the wrapper
// still injects the OTel tracer hook + tunnelRoute into the build and the
// resulting `.next/server/instrumentation.js` crashes on Netlify's Linux
// runtime with "Cannot read properties of undefined (reading 'clientModules')"
// when a server component renders without further client-bundle context
// (root /). Vercel tolerates the half-configured build; Netlify does not.
const sentryEnabled = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
)

module.exports = sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      tunnelRoute: '/monitoring'
    })
  : nextConfig
