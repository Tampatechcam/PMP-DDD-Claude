# TASK-R001 — Hoist raw `supabase.from('…')` calls into `lib/db/*`

**Status:** in_progress
**Owner:** claude
**Started:** 2026-05-24T08:30:00Z
**Scope:** Operating principle #3 — "One data-access layer: `lib/db/*.ts` server-side functions. No raw `supabase.from()` scattered in components."
**Source:** [002-app-structure-audit.md §C + §Gap-2](002-app-structure-audit.md)

## Six offenders

| File | Line | Call | New helper |
|---|---|---|---|
| `app/admin/page.tsx` | 30 | `clients.select(id, {count, head})` | `lib/db/dashboards.ts:adminCounts()` |
| `app/admin/page.tsx` | 34 | `orders.select(...).eq('needs_direct_mail', true)` | ditto |
| `app/admin/page.tsx` | 38 | `proofs.select(...).eq('status','pending')` | ditto |
| `app/admin/page.tsx` | 41 | `invoices.select(...)` | ditto |
| `app/admin/proofs/[id]/upload/page.tsx` | 18 | `orders.select(...).eq('id', params.id).maybeSingle()` | `lib/db/orders.ts:getOrderById(id)` |
| `app/(client)/orders/[order_number]/page.tsx` | 31 | `offices.select(...).eq('id', order.office_id)` | `lib/db/offices.ts:getOfficeById(id)` |
| `app/admin/orders/[order_number]/page.tsx` | 32 | same as above | ditto |
| `components/admin/TeamSection.tsx` | 23 | `profiles.select(...).eq('client_id', client.id)` | `lib/db/profiles.ts:adminListTeamForClient(clientId)` |

(That's 8 cell entries; the audit's "6 offenders" is the number of *files* — `app/admin/page.tsx` counts as one even though it has 4 separate `.from()` calls; two near-duplicate office selects also share a fix.)

## Plan

1. New file `lib/db/dashboards.ts` with `adminCounts()` returning
   `{ clients, orders, pendingProofs, invoices }` (one `Promise.all` of
   four count queries; the existing `app/admin/page.tsx` shape stays
   identical, just behind the helper).
2. Add `getOrderById(id: string)` to `lib/db/orders.ts` — sibling of
   `getOrderByRef`. Different concern (UUID vs ref slug) so they can't
   merge.
3. Add `getOfficeById(id: string)` to a new `lib/db/offices.ts` (no
   such file today; the office reads have been inline).
4. Add `adminListTeamForClient(clientId: string)` to
   `lib/db/profiles.ts` — server-only; joins `auth.users` for email
   the same way `adminListProfiles` does.
5. Swap the eight callsites.

## Files to touch

- New: `lib/db/dashboards.ts`, `lib/db/offices.ts`
- Edit: `lib/db/orders.ts`, `lib/db/profiles.ts`
- Edit: `app/admin/page.tsx`, `app/admin/proofs/[id]/upload/page.tsx`, `app/(client)/orders/[order_number]/page.tsx`, `app/admin/orders/[order_number]/page.tsx`, `components/admin/TeamSection.tsx`

## Verification

- `npx tsc --noEmit` clean
- `grep "from('clients'\|from('orders'\|from('offices'\|from('profiles'\|from('proofs'\|from('invoices'" app/ components/` returns empty
- `/admin` Overview still renders 40 / 207 / 0 / 0 counts
- `/admin/clients/<FTA-id>` Team section still renders members
- Order detail pages still render correctly
