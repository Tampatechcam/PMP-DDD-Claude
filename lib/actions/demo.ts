'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Demo provisioning. Tied to the temporary "Demo: Client" / "Demo: Admin"
 * buttons on the login page so we can click through the app without a real
 * sign-in flow. DELETE this file and its buttons before going to production.
 *
 * What each action does:
 *   1. Idempotently create a demo user via the service-role client (the
 *      profile is created by the on_auth_user_created trigger).
 *   2. Promote the profile to the right role + link it to a demo client.
 *   3. Seed a minimal venue/office/order/proof so every page has something
 *      to render.
 *   4. Sign the browser in via password; the cookie redirect lands the
 *      user on /orders (client) or /admin.
 *
 * These actions require migrations 001–006 to be applied to the linked
 * Supabase project. If not, you'll see a "relation does not exist" error;
 * run `supabase db push` first.
 */

const DEMO_CLIENT_EMAIL = 'demo-client@pmp.test'
const DEMO_ADMIN_EMAIL = 'demo-admin@pmp.test'
const DEMO_PASSWORD = 'demo-pmp-passw0rd!'

async function ensureUser(email: string): Promise<string> {
  // List + filter is the supported way; admin.getUserByEmail doesn't exist.
  // We page large enough that the demo accounts always land on page one.
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

async function ensureDemoClientRow(): Promise<string> {
  // Stable id for the demo client across runs — so reseeding doesn't keep
  // creating duplicates. The UUID is arbitrary; it just needs to be fixed.
  const id = '11111111-1111-1111-1111-111111111111'
  const { error } = await supabaseAdmin
    .from('clients')
    .upsert(
      {
        id,
        name: 'Demo Advisor Group',
        is_group: false,
        business_name: 'Demo Advisor Group, LLC',
        ein: '00-0000000',
        disclaimer:
          'For educational purposes. Not an offer to buy or sell any security.',
        default_class_type: 'R101',
        default_mailer_type: 'Demo Mailer',
        default_mailing_quantity: 7000,
        default_digital_budget: 840,
        responsibility: 'Cameron',
        is_non_profit: false
      },
      { onConflict: 'id' }
    )
  if (error) throw error
  return id
}

async function ensureDemoOffice(clientId: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from('offices')
    .select('id')
    .eq('client_id', clientId)
    .limit(1)
    .maybeSingle()
  if (existing) return existing.id

  const { data, error } = await supabaseAdmin
    .from('offices')
    .insert({
      client_id: clientId,
      name: 'Demo HQ',
      advisor_names: ['Alex Demo'],
      registration_phone: '(555) 555-1234',
      is_primary: true
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('insert office failed')
  return data.id
}

async function ensureDemoVenue(clientId: string) {
  const venueId = '22222222-2222-2222-2222-222222222222'
  await supabaseAdmin
    .from('venues')
    .upsert(
      {
        id: venueId,
        client_id: clientId,
        name: 'Demo Conference Center',
        applicable_class_types: ['R101', 'W101'],
        address: {
          street: '123 Demo St',
          city: 'Anytown',
          state: 'MO',
          zip: '63100'
        }
      },
      { onConflict: 'id' }
    )
  const buildingId = '33333333-3333-3333-3333-333333333333'
  await supabaseAdmin
    .from('buildings')
    .upsert({ id: buildingId, venue_id: venueId, name: 'Main Hall' }, { onConflict: 'id' })
  const roomId = '44444444-4444-4444-4444-444444444444'
  await supabaseAdmin
    .from('rooms')
    .upsert(
      { id: roomId, building_id: buildingId, name: 'Room 101', capacity: 60 },
      { onConflict: 'id' }
    )
}

async function ensureDemoOrders(clientId: string, officeId: string) {
  // Skip if any demo orders exist for this client already.
  const { count } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
  if ((count ?? 0) > 0) return

  // Use numbers far above the real sequence so an eventual import doesn't
  // collide. Adjust later when wiring the real numbering.
  const eventDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert({
      order_number: 90001,
      client_id: clientId,
      office_id: officeId,
      advisor_name: 'Alex Demo',
      needs_direct_mail: true,
      needs_digital: true,
      class_type: 'R101',
      market: 'Demo Market #1',
      venue_text: 'Demo Conference Center — Main Hall',
      venue_address_text: '123 Demo St, Anytown MO 63100',
      event_1_date: eventDate,
      event_1_room: 'Room 101',
      start_time: '18:00:00',
      end_time: '20:30:00',
      mailing_quantity: 7000,
      mailer_type: 'Demo Mailer',
      digital_budget: 840,
      landing_page_url_digital: 'https://demo.rsvp101.com',
      main_status: 'Submitted',
      dm_status: 'All Details Added'
    })
    .select('id')
    .single()
  if (error || !order) throw error ?? new Error('insert order failed')

  await supabaseAdmin.from('order_events').insert({
    order_id: order.id,
    event: 'Order created'
  })
}

async function signInBrowser(email: string) {
  // signInWithPassword on the server client sets the auth cookies on the
  // response. The redirect then lands the user on the right shell.
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD
  })
  if (error) throw error
}

export async function signInAsDemoClient() {
  const userId = await ensureUser(DEMO_CLIENT_EMAIL)
  const clientId = await ensureDemoClientRow()
  const officeId = await ensureDemoOffice(clientId)
  await ensureDemoVenue(clientId)
  await ensureDemoOrders(clientId, officeId)

  // Link the auth user to the demo client and force role = 'client'.
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ client_id: clientId, role: 'client', full_name: 'Demo Client' })
    .eq('id', userId)
  if (error) throw error

  await signInBrowser(DEMO_CLIENT_EMAIL)
  redirect('/orders')
}

export async function signInAsDemoAdmin() {
  const userId = await ensureUser(DEMO_ADMIN_EMAIL)
  // Make sure there's at least one client + a sample order behind the admin
  // shell so /admin and /admin/orders aren't barren.
  const clientId = await ensureDemoClientRow()
  const officeId = await ensureDemoOffice(clientId)
  await ensureDemoVenue(clientId)
  await ensureDemoOrders(clientId, officeId)

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ client_id: null, role: 'admin', full_name: 'Demo Admin' })
    .eq('id', userId)
  if (error) throw error

  await signInBrowser(DEMO_ADMIN_EMAIL)
  redirect('/admin')
}
