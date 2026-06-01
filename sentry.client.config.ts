import * as Sentry from '@sentry/nextjs'

/**
 * Browser-side Sentry init.
 *
 * Design notes:
 *   - DSN-gated: with no DSN (local dev without the env var, or any env
 *     where Sentry is intentionally off) we never call `Sentry.init`, so
 *     the transport + replay subsystem stay completely idle.
 *   - Environment-aware sampling: `tracesSampleRate` and replay sampling
 *     are tuned per-env so we don't burn the quota on previews or pin
 *     the dev tab with 100% session replay.
 *   - Replay integration is only attached when we actually intend to
 *     sample replays. Including it with `replaysSessionSampleRate: 0`
 *     would still ship the replay code to every browser.
 *   - Privacy-safe replay defaults: this app shows advisor names,
 *     client business info, and order numbers — all PII. `maskAllText`
 *     + `blockAllMedia` keep that out of replays; opt-out per-element
 *     with `data-sentry-unmask` where it's actually needed.
 *   - Release tagged from the Vercel commit SHA so source maps line up
 *     with the deploy that produced the error.
 */

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const environment = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV
const isProd = environment === 'production'
const release = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

// Replays only in prod. 10% of normal sessions, 100% of error sessions —
// these are Sentry's recommended baselines, tuned down to 0 elsewhere so
// preview / dev don't bundle the replay code or send any sessions.
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

    // Don't auto-attach user IP / cookies. We opt-in via setUser() when
    // we have an authenticated profile.
    sendDefaultPii: false,

    // Only attach the replay SDK when we actually intend to sample.
    integrations: replayEnabled
      ? [
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true
          })
        ]
      : [],

    replaysSessionSampleRate,
    replaysOnErrorSampleRate
  })
}
