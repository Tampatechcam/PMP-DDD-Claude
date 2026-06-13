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
 * client), plus an order each, a B-office, an A-proof, and a storage object
 * under B's prefix. It then signs in as user A and asserts, across 14 checks:
 *
 *   Cross-tenant table reads/writes (orders, order_events, proofs, invoices):
 *     1. Listing orders only returns A's row.
 *     2. Reading B's order by its UUID returns nothing.
 *     3. Updating B's order is rejected.
 *     4. Reading B's order_events / proofs returns nothing.
 *     5. Invoices are hidden from clients.
 *
 *   R007 extensions:
 *     6. security_invoker regression guard — reading orders_with_display_status
 *        returns only A (a dropped `security_invoker = true` would leak all rows).
 *     7. Reading B's order *through the view* returns nothing.
 *     8. Cross-tenant reads of clients + offices return nothing.
 *     9. profiles self-promotion to admin is rejected (role stays 'client').
 *    10. proofs status-enum guard — A cannot revert a proof to 'pending'.
 *    11. Storage RLS — A cannot list or download objects under B's prefix.
 *
 * Exit code is 0 on pass, 1 on any failure. The provisioned rows + storage
 * object are torn down at the end whether the assertions pass or fail.
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
  officeBId: string
  proofAId: string
  storageBPath: string
  userAEmail: string
  userBEmail: string
  password: string
}

const PROOFS_BUCKET = 'proofs'

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

  // An office under B — for the cross-tenant offices read test.
  const { data: officeB } = await admin
    .from('offices')
    .insert({ client_id: clientBId, name: `RLS Verify Office B ${stamp}`, state: 'XX' })
    .select('id')
    .single()
  if (!officeB) throw new Error('Could not insert verify office')

  // A proof under A's order, pre-decided as 'approved' — for the proof
  // status-enum guard test (A must not be able to revert it to 'pending').
  const { data: proofA } = await admin
    .from('proofs')
    .insert({
      order_id: orderA.id,
      version: 1,
      storage_path: `${clientAId}/rls-verify.pdf`,
      status: 'approved'
    })
    .select('id')
    .single()
  if (!proofA) throw new Error('Could not insert verify proof')

  // An object under B's storage prefix — for the storage RLS test. The
  // service-role admin client bypasses storage RLS, so this always lands.
  const storageBPath = `${clientBId}/rls-verify-${stamp}.txt`
  await admin.storage
    .from(PROOFS_BUCKET)
    .upload(storageBPath, Buffer.from('rls-verify secret'), {
      contentType: 'text/plain',
      upsert: true
    })

  return {
    clientAId,
    clientBId,
    userAId: userA.user.id,
    userBId: userB.user.id,
    orderAId: orderA.id,
    orderBId: orderB.id,
    officeBId: officeB.id,
    proofAId: proofA.id,
    storageBPath,
    userAEmail,
    userBEmail,
    password
  }
}

async function teardown(p: Provisioned) {
  // Order matters: storage object + proofs + offices first (FK children),
  // then orders → clients → auth users.
  await admin.storage.from(PROOFS_BUCKET).remove([p.storageBPath]).catch(() => {})
  await admin.from('proofs').delete().eq('id', p.proofAId)
  await admin.from('offices').delete().eq('id', p.officeBId)
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

    // ── R007 extensions ──────────────────────────────────────────────

    // Gap #1 + #3: read-via-view + security_invoker regression guard.
    // orders_with_display_status has no WHERE clause of its own — it relies
    // on the underlying orders RLS, which only applies when the view keeps
    // `security_invoker = true`. If a future `create or replace view` drops
    // that option, the view runs as its (superuser) owner and A would see
    // every order. These two asserts catch that regression behaviorally.
    await assert('orders view returns only A (security_invoker guard)', async () => {
      const { data } = await aClient
        .from('orders_with_display_status')
        .select('id, client_id')
      if (!data) throw new Error('null data')
      if (data.length !== 1 || data[0]!.client_id !== p.clientAId) {
        throw new Error(
          `view leaked ${data.length} row(s) — security_invoker may be OFF on orders_with_display_status`
        )
      }
    })

    await assert("reading B's order via the view returns nothing", async () => {
      const { data } = await aClient
        .from('orders_with_display_status')
        .select('id')
        .eq('id', p.orderBId)
      if (!data) throw new Error('null data')
      if (data.length !== 0) throw new Error("A saw B's order through the view")
    })

    // Gap #4: cross-tenant reads of clients + offices.
    await assert("reading B's client row returns nothing", async () => {
      const { data } = await aClient.from('clients').select('id').eq('id', p.clientBId)
      if (!data) throw new Error('null data')
      if (data.length !== 0) throw new Error("A saw B's client")
    })

    await assert("reading B's office returns nothing", async () => {
      const { data } = await aClient.from('offices').select('id').eq('id', p.officeBId)
      if (!data) throw new Error('null data')
      if (data.length !== 0) throw new Error("A saw B's office")
    })

    // Gap #5a: profiles self-promotion guard. The profiles_update_self policy
    // has a WITH CHECK that freezes `role`. A's attempt to set role='admin'
    // must leave the stored role unchanged. We read the truth back via admin.
    await assert('A cannot promote self to admin', async () => {
      await aClient.from('profiles').update({ role: 'admin' }).eq('id', p.userAId)
      const { data } = await admin
        .from('profiles')
        .select('role')
        .eq('id', p.userAId)
        .single()
      if (data?.role === 'admin') throw new Error('A escalated their own role to admin')
    })

    // Gap #5b: proofs status-enum guard. proofs_client_decide restricts the
    // client to status in ('approved','revision_requested'). Proof A was
    // provisioned 'approved'; A must not be able to revert it to 'pending'.
    await assert("A cannot revert a proof to 'pending'", async () => {
      await aClient.from('proofs').update({ status: 'pending' }).eq('id', p.proofAId)
      const { data } = await admin
        .from('proofs')
        .select('status')
        .eq('id', p.proofAId)
        .single()
      if (data?.status === 'pending') {
        throw new Error("A set a proof status outside the allowed client enum")
      }
    })

    // Gap #2: storage RLS on the private proofs bucket. A must not be able to
    // list or download objects under B's client-id prefix.
    await assert("A cannot list B's storage folder", async () => {
      const { data, error } = await aClient.storage.from(PROOFS_BUCKET).list(p.clientBId)
      // Either an explicit error or an empty listing is acceptable; a
      // non-empty listing means A can see B's objects.
      if (!error && data && data.length > 0) {
        throw new Error(`A listed ${data.length} object(s) under B's prefix`)
      }
    })

    await assert("A cannot download B's proof object", async () => {
      const { data, error } = await aClient.storage
        .from(PROOFS_BUCKET)
        .download(p.storageBPath)
      // RLS should deny: expect an error and/or no blob. Getting bytes back
      // means the object leaked.
      if (!error && data) {
        const size = (data as Blob).size ?? 0
        if (size > 0) throw new Error("A downloaded B's proof object")
      }
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
