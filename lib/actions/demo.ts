'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Demo provisioning. Tied to the temporary "Demo: Client" / "Demo: Admin"
 * buttons on the login page so the app is clickable without a real sign-in.
 * DELETE this file and the login-page buttons before going to production.
 *
 * What runs on each click:
 *   1. Idempotently create the demo user(s) via the service-role client.
 *      `auth.admin.createUser` fires the on_auth_user_created trigger
 *      which inserts the corresponding `profiles` row; we still upsert
 *      after to guarantee `role` + `client_id` end up where we want them,
 *      in case the trigger missed.
 *   2. Idempotently seed two clients (one independent firm + one FTA-style
 *      group with three offices), a venue tree, and four orders in mixed
 *      states so the dashboard isn't barren.
 *   3. Sign the browser in via password.
 *
 * Requires migrations 001-007 applied to the linked Supabase project.
 */

const DEMO_CLIENT_EMAIL = 'demo-client@pmp.test'
const DEMO_ADMIN_EMAIL = 'demo-admin@pmp.test'
const DEMO_PASSWORD = 'demo-pmp-passw0rd!'

const SCOUT_CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const FTA_CLIENT_ID = 'fa000000-0000-0000-0000-000000000001'

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

async function ensureClients() {
  await supabaseAdmin.from('clients').upsert(
    [
      {
        id: SCOUT_CLIENT_ID,
        name: 'Scout Financial Group',
        is_group: false,
        business_name: 'Scout Financial Group, LLC',
        ein: '47-1182734',
        disclaimer:
          'For educational purposes only. Not a solicitation to buy or sell securities.',
        default_class_type: 'R101',
        default_mailer_type: 'New Scout R101',
        default_mailing_quantity: 7000,
        default_digital_budget: 840,
        default_mailer_rate: 0.485,
        direct_mail_discount: '5%',
        tech_sequences: 'Sequence A',
        responsibility: 'Cameron',
        is_non_profit: false
      },
      {
        id: FTA_CLIENT_ID,
        name: 'FTA',
        is_group: true,
        business_name: 'Financial Tax Advisors',
        ein: '83-2298100',
        disclaimer:
          'Financial Tax Advisors is a registered investment adviser. ' +
          'Investments involve risk and are not guaranteed.',
        default_class_type: 'R101',
        default_mailer_type: 'FTA R101 Standard',
        default_mailing_quantity: 10000,
        default_digital_budget: 1200,
        default_mailer_rate: 0.465,
        direct_mail_discount: '8%',
        responsibility: 'Chad',
        is_non_profit: false
      }
    ],
    { onConflict: 'id' }
  )
}

async function ensureOffices() {
  await supabaseAdmin.from('offices').upsert(
    [
      {
        id: '20000000-0000-0000-0000-000000000001',
        client_id: SCOUT_CLIENT_ID,
        name: 'Leawood',
        advisor_names: ['Alex Demo'],
        registration_phone: '(913) 555-1010',
        is_primary: true
      },
      {
        id: '20000000-0000-0000-0000-000000000010',
        client_id: FTA_CLIENT_ID,
        name: 'St. Louis',
        advisor_names: ['Pat Reilly', 'Sarah Chen'],
        registration_phone: '(314) 555-2000',
        is_primary: true
      },
      {
        id: '20000000-0000-0000-0000-000000000011',
        client_id: FTA_CLIENT_ID,
        name: 'Oak Brook',
        advisor_names: ['Mike Halloran'],
        registration_phone: '(630) 555-3000'
      },
      {
        id: '20000000-0000-0000-0000-000000000012',
        client_id: FTA_CLIENT_ID,
        name: 'Dallas',
        advisor_names: ['Jennifer Wu', 'Carlos Diaz'],
        registration_phone: '(214) 555-4000'
      }
    ],
    { onConflict: 'id' }
  )
}

async function ensureVenues() {
  await supabaseAdmin.from('venues').upsert(
    [
      {
        id: '30000000-0000-0000-0000-000000000001',
        client_id: SCOUT_CLIENT_ID,
        name: 'University of Saint Mary — Johnson County Campus',
        applicable_class_types: ['R101', 'W101'],
        address: {
          street: '11221 Roe Ave., Suite 100',
          city: 'Leawood',
          state: 'KS',
          zip: '66211'
        }
      },
      {
        id: '30000000-0000-0000-0000-000000000002',
        client_id: FTA_CLIENT_ID,
        name: 'Schlafly Library — St. Louis',
        applicable_class_types: ['R101', 'SS101', 'W101'],
        address: { street: '225 N Euclid Ave', city: 'St. Louis', state: 'MO', zip: '63108' }
      },
      {
        id: '30000000-0000-0000-0000-000000000003',
        client_id: FTA_CLIENT_ID,
        name: 'Oak Brook Public Library',
        applicable_class_types: ['R101', 'WAT'],
        address: { street: '600 Oak Brook Rd', city: 'Oak Brook', state: 'IL', zip: '60523' }
      }
    ],
    { onConflict: 'id' }
  )
  await supabaseAdmin.from('buildings').upsert(
    [
      { id: '40000000-0000-0000-0000-000000000001', venue_id: '30000000-0000-0000-0000-000000000001', name: 'Conference Center' },
      { id: '40000000-0000-0000-0000-000000000002', venue_id: '30000000-0000-0000-0000-000000000002', name: 'Main Hall' }
    ],
    { onConflict: 'id' }
  )
  await supabaseAdmin.from('rooms').upsert(
    [
      { id: '50000000-0000-0000-0000-000000000001', building_id: '40000000-0000-0000-0000-000000000001', name: 'Room A', capacity: 60 },
      { id: '50000000-0000-0000-0000-000000000002', building_id: '40000000-0000-0000-0000-000000000001', name: 'Room B', capacity: 30 },
      { id: '50000000-0000-0000-0000-000000000003', building_id: '40000000-0000-0000-0000-000000000002', name: 'Auditorium', capacity: 120 }
    ],
    { onConflict: 'id' }
  )
}

function inDays(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
}

async function ensureOrders() {
  const { count } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('order_number', 90000)
  if ((count ?? 0) >= 4) return

  // Wipe and reseed demo orders so changes here are visible after click.
  await supabaseAdmin.from('orders').delete().gte('order_number', 90000)

  const rows = [
    {
      order_number: 90001,
      client_id: SCOUT_CLIENT_ID,
      office_id: '20000000-0000-0000-0000-000000000001',
      advisor_name: 'Alex Demo',
      needs_direct_mail: true,
      needs_digital: true,
      class_type: 'R101',
      market: 'South Leawood #2',
      venue_id: '30000000-0000-0000-0000-000000000001',
      building_id: '40000000-0000-0000-0000-000000000001',
      room_id: '50000000-0000-0000-0000-000000000001',
      venue_text: 'University of Saint Mary — Johnson County Campus',
      venue_address_text: '11221 Roe Ave., Suite 100, Leawood, KS 66211',
      event_1_date: inDays(14),
      event_1_room: 'Room A',
      event_2_date: inDays(16),
      event_2_room: 'Room A',
      start_time: '18:00:00',
      end_time: '20:30:00',
      mailing_quantity: 7000,
      mailer_type: 'New Scout R101',
      digital_budget: 840,
      landing_page_url_digital: 'https://scout.rsvp101.com',
      main_status: 'Submitted',
      dm_status: 'All Details Added'
    },
    {
      order_number: 90002,
      client_id: FTA_CLIENT_ID,
      office_id: '20000000-0000-0000-0000-000000000010',
      advisor_name: 'Pat Reilly',
      needs_direct_mail: true,
      class_type: 'SS101',
      market: 'STL West County',
      venue_id: '30000000-0000-0000-0000-000000000002',
      venue_text: 'Schlafly Library — St. Louis · Main Hall',
      venue_address_text: '225 N Euclid Ave, St. Louis, MO 63108',
      event_1_date: inDays(7),
      start_time: '18:30:00',
      end_time: '20:00:00',
      mailing_quantity: 10000,
      mailer_type: 'FTA SS101',
      main_status: 'In Progress',
      dm_status: 'Order Sent'
    },
    {
      order_number: 90003,
      client_id: FTA_CLIENT_ID,
      office_id: '20000000-0000-0000-0000-000000000011',
      advisor_name: 'Mike Halloran',
      needs_digital: true,
      class_type: 'R101',
      market: 'DuPage West',
      venue_id: '30000000-0000-0000-0000-000000000003',
      venue_text: 'Oak Brook Public Library',
      venue_address_text: '600 Oak Brook Rd, Oak Brook, IL 60523',
      event_1_date: inDays(28),
      start_time: '19:00:00',
      end_time: '20:30:00',
      digital_budget: 1500,
      landing_page_url_digital: 'https://fta-oakbrook.rsvp101.com',
      main_status: 'Submitted',
      digital_status: 'In Production'
    },
    {
      order_number: 90004,
      client_id: FTA_CLIENT_ID,
      office_id: '20000000-0000-0000-0000-000000000012',
      advisor_name: 'Jennifer Wu',
      needs_direct_mail: true,
      needs_digital: true,
      class_type: 'WAT',
      market: 'North Dallas',
      venue_text: 'Dallas Marriott Las Colinas',
      venue_address_text: '223 W Las Colinas Blvd, Irving, TX 75039',
      event_1_date: inDays(-3),
      start_time: '18:00:00',
      end_time: '20:00:00',
      mailing_quantity: 12000,
      mailer_type: 'FTA WAT',
      digital_budget: 2200,
      main_status: 'Order Completed',
      dm_status: 'Complete'
    }
  ]

  const { data: inserted, error } = await supabaseAdmin
    .from('orders')
    .insert(rows)
    .select('id, order_number')
  if (error) throw error

  // Add an order_events row per order so History panels aren't empty.
  if (inserted) {
    await supabaseAdmin.from('order_events').insert(
      inserted.flatMap((o) => [
        { order_id: o.id, event: 'Order created' },
        ...(o.order_number === 90001
          ? [{ order_id: o.id, event: 'Awaiting proof' }]
          : []),
        ...(o.order_number === 90004
          ? [
              { order_id: o.id, event: 'Proof v1 uploaded' },
              { order_id: o.id, event: 'Proof v1 approved' },
              { order_id: o.id, event: 'Order completed' }
            ]
          : [])
      ])
    )
  }
}

async function signInBrowser(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD
  })
  if (error) throw error
}

async function provisionAll() {
  await ensureClients()
  await ensureOffices()
  await ensureVenues()
  await ensureOrders()
}

export async function signInAsDemoClient() {
  const userId = await ensureUser(DEMO_CLIENT_EMAIL)
  await provisionAll()
  // Demo client is mapped to the multi-office FTA group so the office
  // switcher actually has something to switch between.
  await ensureProfile(userId, 'client', FTA_CLIENT_ID, 'Demo Client (FTA)')
  await signInBrowser(DEMO_CLIENT_EMAIL)
  redirect('/orders')
}

export async function signInAsDemoAdmin() {
  const userId = await ensureUser(DEMO_ADMIN_EMAIL)
  await provisionAll()
  await ensureProfile(userId, 'admin', null, 'Demo Admin')
  await signInBrowser(DEMO_ADMIN_EMAIL)
  redirect('/admin')
}
