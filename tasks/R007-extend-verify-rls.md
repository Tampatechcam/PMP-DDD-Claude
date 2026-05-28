# TASK-R007 — Extend verify-rls.ts for the 5 coverage gaps

**Status:** complete
**Owner:** claude (direct execution)
**Completed:** 2026-05-28
**Files touched:** `scripts/verify-rls.ts` (provisioning + teardown + 8 new asserts; header doc).
**Scope:** Close the 5 RLS coverage gaps scoped by [R006](R006-security-rls-verify.md).
**Source:** R006 "Coverage gaps identified" §1–5.

**Order-number constraint:** ✅ unchanged. Test orders still use `900000 + random`
and are torn down in `finally`. No real `orders.order_number` touched.
See [[keep-integer-order-numbers]].

## What was added

Provisioning now also creates: a **B office**, an **A proof** (pre-decided
`approved`), and a **storage object** under B's `proofs/{clientBId}/…` prefix
(uploaded with the service-role client, which bypasses storage RLS). Teardown
removes all three (storage object first, then proofs/offices, then the existing
orders → clients → users chain).

8 new assertions (run as signed-in user A), mapping to the R006 gaps:

| R006 gap | Assertion(s) | Why |
|---|---|---|
| #1 security_invoker regression + #3 read-via-view | "orders view returns only A", "reading B's order via the view returns nothing" | `orders_with_display_status` has no WHERE of its own — it leans on `orders` RLS, which only applies while the view keeps `security_invoker = true`. If a future `create or replace view` drops the option, the view runs as its superuser owner and A sees every order. Behavioral test catches the exact regression migration 007 had to fix. |
| #4 cross-tenant clients/offices | "reading B's client row returns nothing", "reading B's office returns nothing" | Probes the `clients` / `offices` SELECT policies that existed but were never exercised. |
| #5a profiles self-promotion | "A cannot promote self to admin" | `profiles_update_self` WITH CHECK freezes `role`; A's `update … role='admin'` must leave the stored role unchanged (verified by reading back via the admin client). |
| #5b proofs status-enum | "A cannot revert a proof to 'pending'" | `proofs_client_decide` restricts the client to `status in ('approved','revision_requested')`. Proof A starts `approved`; A's attempt to set `pending` must not take. |
| #2 storage RLS | "A cannot list B's storage folder", "A cannot download B's proof object" | The `proofs` bucket is private; A must get empty/denied on `list(clientBId)` and `download(B-path)`. PDFs are the most sensitive hosted data. |

### Note on Gap #1 implementation choice

R006 suggested a `pg_class.reloptions` catalog check. supabase-js can't query
system catalogs without raw-SQL access, so I used the **behavioral** equivalent
instead: querying the view as a tenant directly exercises the security outcome
(`security_invoker` ON → tenant-scoped; OFF → full leak). This is strictly
stronger than a config check — it tests the result, not the setting — and adds
no dependency. `venues/buildings/rooms` (Gap #4 tail) were left out: they're
client-scoped exactly like offices, and the office assert already guards that
policy shape; adding three near-identical probes wasn't worth the provisioning.

## Run result

`npm run verify:rls` — **exit 0, all 14 assertions passed** (6 original + 8 new),
clean teardown (verified 0 leftover clients/offices/orders/storage objects).

```
  ok  · orders list returns only A
  ok  · reading B's order by UUID returns nothing
  ok  · updating B's order is rejected
  ok  · reading B's order_events returns nothing
  ok  · reading B's proofs returns nothing
  ok  · invoices table is hidden from clients
  ok  · orders view returns only A (security_invoker guard)
  ok  · reading B's order via the view returns nothing
  ok  · reading B's client row returns nothing
  ok  · reading B's office returns nothing
  ok  · A cannot promote self to admin
  ok  · A cannot revert a proof to 'pending'
  ok  · A cannot list B's storage folder
  ok  · A cannot download B's proof object

RLS verification PASSED.
```

## Follow-ups (unchanged from R006)

- Wire `npm run verify:rls` into CI (push to `main` / Vercel preview).
- Decide on `ws` devDependency vs the `NoopWebSocket` shim once on Node 22+.
