# T020 — Live real-time data widget (Supabase Realtime + `router.refresh()`)

**Date:** 2026-06-02
**Branch:** `feature/sentry-client-hardening`
**Status:** Shipped

## What

The dashboard now updates **live**, with no manual refresh, the instant the
database changes. The headline case: a client watching `/orders` sees a status
flip to "Awaiting Your Approval" the moment an admin uploads a proof. Admin
Overview and the order-detail page update the same way.

This closes the long-standing TODO: *"Real-time updates via Supabase Realtime —
proof status flips should land in the client portal without a refresh."*

## Why

Until now the portal was a point-in-time render: a change in `orders`/`proofs`
(an admin proof upload, the hourly sheet sync, a status edit) only showed up when
the user reloaded. For a client waiting on a proof, that's the difference between
"it's ready" and "I didn't know it was ready." Realtime makes the wait
self-resolving.

## Approach — refresh-on-event, not client-side re-query

The decisive constraint: **`display_status` is computed by the
`orders_with_display_status` view** (pending/revision proof → `dm_status` →
`digital_status` → `'Submitted'`). Supabase Realtime emits **raw** `orders` /
`proofs` rows, *not* the view. Re-deriving status in the browser from raw rows
would duplicate that precedence logic and risk drift the first time the view
changes.

So instead of patching client state from the event payload, a thin client
component subscribes to Realtime and calls **`router.refresh()`** on any relevant
change. The Server Components re-run, re-fetch through `lib/db` + the RLS'd view,
and the UI updates with correct, tenant-scoped, view-computed data. The event is
just a *signal that something changed* — never a source of truth.

Key properties:
- **RLS-filtered for free.** The browser Supabase client (`createBrowserClient`,
  anon + session JWT) carries the user's identity, so Realtime `postgres_changes`
  only deliver events for rows the session can already `SELECT`. No cross-tenant
  leakage; client A never even receives client B's events.
- **Debounced (~400 ms).** A burst of changes — e.g. the hourly sheet sync
  touching 14 orders — coalesces into a single `router.refresh()` instead of a
  refresh storm.
- **Default replica identity (PK) is enough.** We only need "something changed,"
  not old row values, so no `REPLICA IDENTITY FULL` overhead.

## Files

- **New** `supabase/migrations/20260523000015_realtime_orders_proofs.sql` —
  idempotent `DO` block adding `public.orders` and `public.proofs` to the
  `supabase_realtime` publication (guarded by `pg_publication_tables` checks so
  re-running / `db push` is a no-op). **Applied to the live DB** via the Supabase
  MCP (`apply_migration`); publication now lists `orders` + `proofs`.
- **New** `components/realtime/LiveRefresh.tsx` (`'use client'`) — subscribes to
  `postgres_changes` (`event: '*'`) on the given tables, debounced
  `router.refresh()`, cleans up via `supabase.removeChannel` on unmount. Renders
  `null`. Props: `tables` (default `['orders','proofs']`), `filter` (optional
  postgres_changes filter on top of RLS), `debounceMs` (default 400).
- **Edit** `app/(client)/orders/page.tsx` — mount `<LiveRefresh />` (watch both
  tables) so the client order list updates live.
- **Edit** `app/(client)/orders/[order_number]/page.tsx` — mount two narrowed
  instances: `proofs` filtered to `order_id=eq.<id>` and `orders` filtered to
  `id=eq.<id>`, so the detail page only refreshes for *this* order's changes.
  (Two instances because a single `postgres_changes` filter string can't target
  both `proofs.order_id` and `orders.id` at once.)
- **Edit** `app/admin/page.tsx` — mount `<LiveRefresh />` so Admin Overview sees
  new proofs / order changes live.
- **Fix (drive-by)** `scripts/sync-from-sheet.ts` — `getDate()` destructured a
  regex match into `mm/dd/yy` which are `string | undefined` under
  `noUncheckedIndexedAccess`, breaking `tsc`. Switched to `m[1]!/m[2]!/m[3]!`
  (matching the netlify function's style). This pre-existing error was failing the
  whole typecheck.

## Verification

- **Migration applied:** `SELECT tablename FROM pg_publication_tables WHERE
  pubname='supabase_realtime' AND schemaname='public'` → `orders`, `proofs`.
- **`npx tsc --noEmit`** → clean (exit 0).
- **Manual (recommended before relying on it in prod):** open two sessions —
  admin in one, the linked client in another. Admin uploads/approves a proof or
  edits a status → the client's `/orders` updates within ~1 s, no refresh. A
  *different* client's session receives nothing (RLS).
- **Debounce:** run `scripts/sync-from-sheet.ts --apply` (multi-row change) → one
  coalesced refresh, not a storm.

## Notes / follow-ups

- `router.refresh()` keeps the view + RLS authoritative. If a specific widget
  later needs sub-second / no-flicker updates, that one widget can do targeted
  client-side state patching — but refresh-on-event is the right default here.
- Realtime connection counts are well within plan limits at this scale.
- Optional future polish: a subtle "Updated just now" toast on refresh (the
  `Toast` primitive already exists); a "Sync now" admin button to pair with the
  hourly sheet sync.
