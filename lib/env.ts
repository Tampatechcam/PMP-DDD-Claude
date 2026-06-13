/**
 * Server-side env helpers. Keep reads here so pages/actions share one gate.
 */

/** Demo sign-in buttons on `/login` — off unless explicitly enabled. */
export function isDemoAuthEnabled(): boolean {
  const v = process.env.DEMO_AUTH_ENABLED
  return v === 'true' || v === '1'
}
