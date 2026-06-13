import * as Sentry from '@sentry/nextjs'

/**
 * Browser-side Sentry init (replaces the deprecated `sentry.client.config.ts`).
 *
 * Loaded by `@sentry/nextjs` as the client instrumentation entry. See:
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 *
 * Design notes:
 *   - DSN-gated: with no DSN we never call `Sentry.init`, so the transport
 *     + replay subsystem stay completely idle.
 *   - Environment-aware sampling so previews / dev don't burn quota.
 *   - Replay integration only attached when sampling > 0, so non-prod
 *     bundles don't ship the replay code.
 *   - Privacy-safe replay defaults (`maskAllText` + `blockAllMedia`) —
 *     this app shows advisor names, client business info, and order
 *     numbers. Opt out per-element with `data-sentry-unmask`.
 *   - Release tagged from the Vercel commit SHA so source maps line up
 *     with the deploy that produced the error.
 */

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const environment = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV
const isProd = environment === 'production'
const release = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

// Replays only in prod. 10% of normal sessions, 100% of error sessions —
// Sentry's recommended baselines, tuned to 0 elsewhere so preview / dev
// don't bundle the replay code or send any sessions.
const replaysSessionSampleRate = isProd ? 0.1 : 0
const replaysOnErrorSampleRate = isProd ? 1.0 : 0
const replayEnabled = replaysSessionSampleRate > 0 || replaysOnErrorSampleRate > 0

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release,

    // 100% traces in dev for fast feedback; 10% in prod to control cost.
    tracesSampleRate: isProd ? 0.1 : 1.0,

    // Don't auto-attach user IP / cookies. Opt in via setUser() when we
    // have an authenticated profile.
    sendDefaultPii: false,

    // Only attach the replay SDK when we actually intend to sample.
    integrations: replayEnabled
      ? [
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ]
      : [],

    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
  })
}

// Required by @sentry/nextjs to instrument client-side router navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
