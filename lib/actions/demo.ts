'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Demo login helpers tied to the temporary "Demo: Client" / "Demo: Admin"
 * buttons on the login page so the app is clickable without a real sign-in.
 * DELETE this file and the login-page buttons before going to production.
 *
 * Steady-state cost per click: 2 round-trips to Supabase
 *   (signInWithPassword + profile upsert).
 * First-ever click adds 1 more (admin.createUser) for the missing user.
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

/**
 * Sign in by password; if the user doesn't exist yet, create them with
 * the service-role client then sign in. Returns the auth user id.
 *
 * The fast path (subsequent clicks) is one network round-trip. Old code
 * called `auth.admin.listUsers({ perPage: 200 })` on every click, which
 * downloaded 200 users just to look up one email — that's the main thing
 * the user complained about feeling slow.
 */
async function signInOrCreate(email: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD
  })
  if (!error && data.user) return data.user.id

  // Slow path: account doesn't exist yet (or password was changed). Create
  // and sign in. Only happens on the first ever click of each demo button.
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

export async function signInAsDemoClient() {
  const userId = await signInOrCreate(DEMO_CLIENT_EMAIL)
  // Demo client maps to FTA so the office switcher actually has Dallas /
  // Oak Brook / Rolling Meadows / Southern Illinois / St. Louis /
  // St. Louis SS to switch between.
  await upsertProfile(userId, 'client', FTA_CLIENT_ID, 'Demo Client (FTA)')
  redirect('/orders')
}

export async function signInAsDemoAdmin() {
  const userId = await signInOrCreate(DEMO_ADMIN_EMAIL)
  await upsertProfile(userId, 'admin', null, 'Demo Admin')
  redirect('/admin')
}
