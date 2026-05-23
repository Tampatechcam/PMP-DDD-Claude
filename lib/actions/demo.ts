'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Demo login helpers tied to the temporary "Demo: Client" / "Demo: Admin"
 * buttons on the login page so the app is clickable without a real sign-in.
 * DELETE this file and the login-page buttons before going to production.
 *
 * What runs on each click:
 *   1. Idempotently ensure the demo user exists via the service-role client.
 *   2. Upsert the corresponding profiles row so role + client_id stick.
 *   3. Sign the browser in via password.
 *
 * Real PMP business data is already imported (see scripts/import-real.ts).
 * This file no longer seeds anything — the database is the source of truth.
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

async function ensureUser(email: string): Promise<string> {
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin
    .listUsers({ page: 1, perPage: 200 })
  if (listErr) throw listErr
  const existing = list.users.find((u) => u.email === email)
  if (existing) return existing.id

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true
  })
  if (error || !created.user) throw error ?? new Error('createUser failed')
  return created.user.id
}

async function ensureProfile(
  userId: string,
  role: 'client' | 'admin',
  clientId: string | null,
  fullName: string
) {
  // Upsert — the on_auth_user_created trigger MAY have created this row,
  // or it MAY not have. Either way we end up correct.
  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      { id: userId, role, client_id: clientId, full_name: fullName },
      { onConflict: 'id' }
    )
  if (error) throw error
}

async function signInBrowser(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD
  })
  if (error) throw error
}

export async function signInAsDemoClient() {
  const userId = await ensureUser(DEMO_CLIENT_EMAIL)
  // Demo client is mapped to the multi-office FTA group so the office
  // switcher actually has something to switch between.
  await ensureProfile(userId, 'client', FTA_CLIENT_ID, 'Demo Client (FTA)')
  await signInBrowser(DEMO_CLIENT_EMAIL)
  redirect('/orders')
}

export async function signInAsDemoAdmin() {
  const userId = await ensureUser(DEMO_ADMIN_EMAIL)
  await ensureProfile(userId, 'admin', null, 'Demo Admin')
  await signInBrowser(DEMO_ADMIN_EMAIL)
  redirect('/admin')
}
