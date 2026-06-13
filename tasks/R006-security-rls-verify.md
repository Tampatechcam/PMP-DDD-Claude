# TASK-R006 — Security / RLS verify

**Status:** complete
**Owner:** claude (orchestrator, direct execution)
**Started:** 2026-05-24T08:50:00Z
**Completed:** 2026-05-24T08:58:00Z
**Files touched:** `scripts/verify-rls.ts` (compatibility patch — see below). No source/migration changes.
**Scope:** Run existing `scripts/verify-rls.ts`, capture results, audit coverage against Round-1 RLS gaps, scope an extension for the `security_invoker` regression guard (Gap #4).
**Source:** AskUserQuestion answer "Security/RLS verify" + Round-1 Gap #4 from [001-schema-rls-audit.md](001-schema-rls-audit.md).

**Order-number constraint:** ✅ this task does **not** modify any real `orders.order_number` value. The script uses out-of-range numbers (`900000 + random`, see `scripts/verify-rls.ts:81`) and tears them down in a `finally` block. Existing order numbers (651, 652, …) are untouched. See [[keep-integer-order-numbers]] in memory.

## Plan

1. Run `npm run verify:rls` against the live Supabase DB (uses `.env.local`). Capture exit code and stdout/stderr.
2. Compare script coverage against Round-1 RLS gaps:
   - Gap #2 (`orders_with_display_status` drift) — non-security, skip.
   - Gap #3 (`order_events` policies not in plan) — covered ✓ (script asserts A can't read B's order_events at `scripts/verify-rls.ts:188-195`).
   - **Gap #4 (no `security_invoker` regression guard) — NOT covered.** Document and scope as TASK-R007 extension.
3. Identify any other coverage gaps (storage RLS, views, clients/offices/venues/buildings/rooms, profiles).

## Existing script coverage (read from `scripts/verify-rls.ts`)

Asserts as user-A on a fresh anon client (`scripts/verify-rls.ts:155-211`):

| # | Assertion | Line |
|---|---|---|
| 1 | orders list returns only A's row | 155-164 |
| 2 | reading B's order by UUID returns nothing | 166-173 |
| 3 | updating B's order is rejected | 175-186 |
| 4 | reading B's order_events returns nothing | 188-195 |
| 5 | reading B's proofs returns nothing | 197-204 |
| 6 | invoices table is hidden from clients | 206-211 |

Provisioning + teardown:
- Test order numbers: `900000 + random(10000)` (`:81`) — well out of real-data range.
- Teardown deletes orders → clients → auth users (`:116-122`); runs in `finally` so it executes on failure too.

## Compatibility patch (required before first run)

The script wouldn't even initialize on this machine — Node 20.18.0 has no global
`WebSocket`, and `supabase-js`'s `createClient` unconditionally constructs a
`RealtimeClient` which needs one. Error:

```
Error: Node.js 20 detected without native WebSocket support.
  at Function.getWebSocketConstructor (.../websocket-factory.ts:178:11)
  at new RealtimeClient (.../RealtimeClient.ts:284:39)
  at SupabaseClient._initRealtimeClient (.../SupabaseClient.ts:609:12)
  at new SupabaseClient (.../SupabaseClient.ts:343:26)
  at createClient (.../index.ts:65:10)
  at <anonymous> (.../scripts/verify-rls.ts:36:15)
```

Two fixes were possible:
1. Add `ws` as a devDependency and pass it as `realtime.transport`.
2. Pass a no-op transport — the script never calls `.channel().subscribe()`, so the transport is constructed but never used.

Chose **(2)** to avoid adding a dependency (the plan's `.cline/rules.md` forbids it without approval). Added a `NoopWebSocket` class + `realtimeShim` near `scripts/verify-rls.ts:36` and passed `realtime: realtimeShim` to both `createClient` calls (admin client at `:36`, anon client at `:146`).

The shim is a stable, localized workaround. If the project moves to Node 22+ (where `WebSocket` is global), it can be removed; until then it lets `npm run verify:rls` run on a clean checkout.

## Run result

`npm run verify:rls` — **exit 0, all 6 assertions passed.**

```
> tsx --env-file=.env.local scripts/verify-rls.ts

Provisioning…
  client A = d436ccb4-9e55-4c8f-abdc-d9841647bfcf
  client B = 2c05b911-a7ee-4f8e-b1dc-0548f442ca9d
  order A  = 0a22f723-4cc7-42a9-97bc-cbe32c707d9b
  order B  = f46977a4-0813-4e1d-b00c-c86892641848
Asserting RLS as user A:
  ok  · orders list returns only A
  ok  · reading B's order by UUID returns nothing
  ok  · updating B's order is rejected
  ok  · reading B's order_events returns nothing
  ok  · reading B's proofs returns nothing
  ok  · invoices table is hidden from clients
Tearing down…

RLS verification PASSED.
```

**Part 17 Definition-of-Done item #6 now flips from "script exists" to "verified against live DB."** No real `orders.order_number` rows were touched — test rows used `900000 + random` and were torn down. See [[keep-integer-order-numbers]].

## Coverage gaps identified

The current script covers cross-tenant reads/writes on `orders`, `order_events`, `proofs`, and `invoices` — the highest-risk paths. Five gaps remain, all worth follow-up tasks:

1. **`security_invoker = true` regression guard (Round-1 Gap #4, HIGH).** If a future `create or replace view` on either `orders_with_display_status` or `client_self_view` omits `with (security_invoker = true)`, Postgres reverts the option to OFF and RLS is silently bypassed on the underlying `orders` / `clients` tables. The script currently can't detect this — it reads tables directly, not the views. Fix: add a SELECT against `pg_class.reloptions` (or `information_schema.views` + a SQL check) asserting both views still have the option set. This is the regression that migration 007 had to fix once already.
2. **Storage RLS on the `proofs` bucket (HIGH).** Part 5.3 policies are not exercised. User A should get 0 rows / 403 when listing or downloading objects under `proofs/{clientBId}/...`. PDFs are the most sensitive data we host — this should be tested.
3. **Read-via-view tests (MEDIUM).** Script reads `orders` directly. A view-level RLS failure (e.g. someone redefines `orders_with_display_status` against a SECURITY DEFINER function that escapes the row filter) wouldn't surface until users complain. Add one assertion that user A's `select * from orders_with_display_status where id = '<B-order-id>'` returns 0 rows.
4. **Cross-tenant read of `clients` / `offices` / `venues` / `buildings` / `rooms` (MEDIUM).** Policies exist (`supabase/migrations/20260523000004_rls_policies.sql:16-73`) but aren't probed. Less likely to leak than orders but a future policy edit could regress them and we wouldn't catch it.
5. **`profiles` self-promotion guard + `proofs` status enum guard (LOW–MEDIUM).** `profiles_update_self` has a `with check` that freezes `role`; `proofs_client_decide` restricts `status in ('approved','revision_requested')`. Both should be exercised: user A tries `update profiles set role='admin'` (should leave role unchanged) and tries `update proofs set status='pending'` on their own proof (should be rejected).

## Recommended follow-ups

- **TASK-R007 — Extend verify-rls.ts for the 5 coverage gaps above.** Each gap = one new `assert()` block in the existing script. Keep the same provisioning / teardown pattern. Add a sixth `assert()` for the `pg_class.reloptions` check on both views (Gap #1) — that's the security_invoker regression guard. Net delta: ~80–120 lines, no new tables or migrations.
- Schedule `npm run verify:rls` to run on every Vercel preview deploy (or at least on every push to `main`). Currently it's only run manually.
- Decide whether to install `ws` as a devDependency and drop the NoopWebSocket shim, or leave the shim until Node 22+. Either is fine; the shim is documented above and is the simpler choice for now.

## Confidence

High. The script's coverage was read line-by-line; the 6 assertions match the 6 highest-value cross-tenant operations from Part 5; the run output above is from a real Supabase round-trip with full teardown. The 5 gaps are concrete and each maps to a specific policy or view in `supabase/migrations/`.
