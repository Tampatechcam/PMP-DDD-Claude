'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Demo login helpers tied to the temporary "Demo: Client" / "Demo: Admin"
 * buttons on the login page so the app is clickable without a real sign-in.
 * DELETE this file and the login-page buttons before going to production.
 *
 * Latency budget per click:
 *   - Already signed in as this demo user → 0 Supabase round-trips, redirect.
 *   - Already signed in as a different user / signed out → 2 round-trips
 *     (signInWithPassword + profiles upsert).
 *   - First-ever click for this email → 3 round-trips (admin.createUser
 *     added on top).
 *
 * Real PMP business data is already imported (see scripts/import-real.ts).
 * This file does NOT seed anything — the database is the source of truth.
 */

const DEMO_CLIENT_EMAIL = 'demo-client@pmp.test'
const DEMO_ADMIN_EMAIL = 'demo-admin@pmp.test'
const DEMO_PASSWORD = 'demo-pmp-passw0rd!'

/**
 * FTA client uuid in the imported data. Looked up via:
 *
 *   curl -X POST https://api.supabase.com/v1/projects/amtunktskgwvvqumrbde/database/query \
 *     -H "Authorization: Bearer <PAT>" -H "Content-Type: application/json" \
 *     -d '{"query":"SELECT id FROM clients WHERE name=''FTA'''"}'
 *
 * After re-importing real data with scripts/import-real.ts this uuid may
 * change — update it here to keep the demo client login pointing at FTA.
 */
const FTA_CLIENT_ID = '490a9889-5f01-436d-8b5e-749adfc41ac4'

async function signInOrCreate(email: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD
  })
  if (!error && data.user) return data.user.id

  // First-ever click: account doesn't exist yet (or password changed).
  // Create via service-role, then sign in.
  const { data: created, error: createErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true
    })
  if (createErr || !created.user) throw createErr ?? new Error('createUser failed')

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD
  })
  if (signInErr) throw signInErr

  return created.user.id
}

async function upsertProfile(
  userId: string,
  role: 'client' | 'admin',
  clientId: string | null,
  fullName: string
) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      { id: userId, role, client_id: clientId, full_name: fullName },
      { onConflict: 'id' }
    )
  if (error) throw error
}

/**
 * If the current session is already as `email`, we can skip every write and
 * redirect immediately. Re-clicking Demo: Client when you're already the
 * demo client becomes free.
 */
async function alreadySignedInAs(email: string): Promise<boolean> {
  // getSession reads the cookie locally — no network call. If the cookie's
  // JWT is stale (user deleted), signInWithPassword later catches it.
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.user.email === email
}

export async function signInAsDemoClient() {
  if (await alreadySignedInAs(DEMO_CLIENT_EMAIL)) redirect('/orders')

  const userId = await signInOrCreate(DEMO_CLIENT_EMAIL)
  // Demo client maps to FTA so the office switcher actually has Dallas /
  // Oak Brook / Rolling Meadows / Southern Illinois / St. Louis /
  // St. Louis SS to switch between.
  await upsertProfile(userId, 'client', FTA_CLIENT_ID, 'Demo Client (FTA)')
  redirect('/orders')
}

export async function signInAsDemoAdmin() {
  if (await alreadySignedInAs(DEMO_ADMIN_EMAIL)) redirect('/admin')

  const userId = await signInOrCreate(DEMO_ADMIN_EMAIL)
  await upsertProfile(userId, 'admin', null, 'Demo Admin')
  redirect('/admin')
}
