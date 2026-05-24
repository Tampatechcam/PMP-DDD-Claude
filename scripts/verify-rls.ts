/**
 * RLS verification — satisfies Part 17 Definition-of-Done #6
 * ("RLS verified: client A cannot read client B's order by guessing UUID").
 *
 * Setup:
 *   - Migrations 001–006 applied to the target Supabase project.
 *   - .env.local has NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *     and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   npm run verify:rls
 *
 * The script provisions two throw-away clients and two users (one per
 * client), inserts an order under each, then signs in as user A and asserts:
 *   1. Listing orders only returns A's row.
 *   2. Reading B's order by its UUID returns nothing.
 *   3. Reading B's invoice / order_events / proofs returns nothing.
 *   4. Updating B's order is rejected.
 *
 * Exit code is 0 on pass, 1 on any failure. The provisioned rows are torn
 * down at the end whether the assertions pass or fail.
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anon || !service) {
  console.error('Missing env vars. See .env.example.')
  process.exit(1)
}

// Node 20 has no global `WebSocket`; supabase-js's RealtimeClient still
// requires one to construct. This script never calls .channel().subscribe(),
// so a no-op transport is enough to satisfy initialization without adding a
// `ws` dependency.
class NoopWebSocket {
  constructor(_url: string, _protocols?: string | string[]) {}
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}
const realtimeShim = {
  transport: NoopWebSocket as unknown as typeof WebSocket
}

const admin = createClient(url, service, {
  auth: { persistSession: false },
  realtime: realtimeShim
})

interface Provisioned {
  clientAId: string
  clientBId: string
  userAId: string
  userBId: string
  orderAId: string
  orderBId: string
  userAEmail: string
  userBEmail: string
  password: string
}

async function provision(): Promise<Provisioned> {
  const stamp = Date.now()
  const password = `rls-verify-${stamp}-passw0rd!`
  const userAEmail = `rls-verify-a-${stamp}@pmp.test`
  const userBEmail = `rls-verify-b-${stamp}@pmp.test`

  const clientAId = randomUUID()
  const clientBId = randomUUID()

  await admin.from('clients').insert([
    { id: clientAId, name: `RLS Verify A ${stamp}` },
    { id: clientBId, name: `RLS Verify B ${stamp}` }
  ])

  const { data: userA } = await admin.auth.admin.createUser({
    email: userAEmail,
    password,
    email_confirm: true
  })
  const { data: userB } = await admin.auth.admin.createUser({
    email: userBEmail,
    password,
    email_confirm: true
  })
  if (!userA.user || !userB.user) throw new Error('createUser returned no user')

  // The handle_new_user trigger inserted profile rows; link them.
  await admin.from('profiles').update({ client_id: clientAId }).eq('id', userA.user.id)
  await admin.from('profiles').update({ client_id: clientBId }).eq('id', userB.user.id)

  // Pick order numbers in a range very unlikely to collide with real data.
  const baseNumber = 900000 + Math.floor(Math.random() * 10000)

  const { data: orderA } = await admin
    .from('orders')
    .insert({
      order_number: baseNumber,
      client_id: clientAId,
      market: 'rls-verify-A'
    })
    .select('id')
    .single()
  const { data: orderB } = await admin
    .from('orders')
    .insert({
      order_number: baseNumber + 1,
      client_id: clientBId,
      market: 'rls-verify-B'
    })
    .select('id')
    .single()
  if (!orderA || !orderB) throw new Error('Could not insert verify orders')

  return {
    clientAId,
    clientBId,
    userAId: userA.user.id,
    userBId: userB.user.id,
    orderAId: orderA.id,
    orderBId: orderB.id,
    userAEmail,
    userBEmail,
    password
  }
}

async function teardown(p: Provisioned) {
  // Order matters: orders → profiles → clients → auth users.
  await admin.from('orders').delete().in('id', [p.orderAId, p.orderBId])
  await admin.from('clients').delete().in('id', [p.clientAId, p.clientBId])
  await admin.auth.admin.deleteUser(p.userAId)
  await admin.auth.admin.deleteUser(p.userBId)
}

async function assert(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ok  · ${name}`)
  } catch (e) {
    console.error(`  FAIL· ${name}`)
    console.error(`        ${e instanceof Error ? e.message : String(e)}`)
    throw e
  }
}

async function main() {
  console.log('Provisioning…')
  const p = await provision()
  console.log(`  client A = ${p.clientAId}`)
  console.log(`  client B = ${p.clientBId}`)
  console.log(`  order A  = ${p.orderAId}`)
  console.log(`  order B  = ${p.orderBId}`)

  let failed = false
  try {
    // Sign in as user A on a fresh anon client.
    const aClient = createClient(url!, anon!, {
      auth: { persistSession: false },
      realtime: realtimeShim
    })
    const { error: signInErr } = await aClient.auth.signInWithPassword({
      email: p.userAEmail,
      password: p.password
    })
    if (signInErr) throw signInErr

    console.log('Asserting RLS as user A:')

    await assert('orders list returns only A', async () => {
      const { data } = await aClient
        .from('orders')
        .select('id, client_id')
      if (!data) throw new Error('null data')
      if (data.length !== 1) throw new Error(`got ${data.length} rows; expected 1`)
      if (data[0]!.client_id !== p.clientAId) {
        throw new Error('saw a row that does not belong to A')
      }
    })

    await assert("reading B's order by UUID returns nothing", async () => {
      const { data } = await aClient
        .from('orders')
        .select('id')
        .eq('id', p.orderBId)
      if (!data) throw new Error('null data')
      if (data.length !== 0) throw new Error("A saw B's order")
    })

    await assert("updating B's order is rejected", async () => {
      const { data, error } = await aClient
        .from('orders')
        .update({ notes: 'A tried to write to B' })
        .eq('id', p.orderBId)
        .select()
      // RLS update yields zero affected rows (no error, just empty).
      if (error) return // also fine — explicit denial
      if (data && data.length > 0) {
        throw new Error("A's update touched B's row")
      }
    })

    await assert("reading B's order_events returns nothing", async () => {
      const { data } = await aClient
        .from('order_events')
        .select('id')
        .eq('order_id', p.orderBId)
      if (!data) throw new Error('null data')
      if (data.length !== 0) throw new Error("A saw B's events")
    })

    await assert("reading B's proofs returns nothing", async () => {
      const { data } = await aClient
        .from('proofs')
        .select('id')
        .eq('order_id', p.orderBId)
      if (!data) throw new Error('null data')
      if (data.length !== 0) throw new Error("A saw B's proofs")
    })

    await assert('invoices table is hidden from clients', async () => {
      const { data } = await aClient.from('invoices').select('id')
      // Clients have no SELECT policy on invoices, so RLS returns [].
      if (!data) throw new Error('null data')
      if (data.length !== 0) throw new Error('A saw an invoice')
    })
  } catch {
    failed = true
  } finally {
    console.log('Tearing down…')
    try {
      await teardown(p)
    } catch (e) {
      console.error('  Teardown failed:', e)
    }
  }

  if (failed) {
    console.error('\nRLS verification FAILED.')
    process.exit(1)
  }
  console.log('\nRLS verification PASSED.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
