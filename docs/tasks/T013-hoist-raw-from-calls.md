# T013 — Hoist raw `supabase.from('…')` calls into `lib/db/*`

**Source:** [tasks/R001-hoist-raw-from-calls.md](../../tasks/R001-hoist-raw-from-calls.md) · agent-b TASK-002 Gap #2

## Problem

Operating principle #3 — "One data-access layer: `lib/db/*.ts` server-side
functions. No raw `supabase.from()` scattered in components." — was
being violated in 5 files. Six call sites were spelling out their own
selects + filters inline:

- `app/admin/page.tsx` — four count queries for the Overview tiles
- `app/admin/proofs/[id]/upload/page.tsx` — order lookup by uuid
- `app/(client)/orders/[order_number]/page.tsx` — office select
- `app/admin/orders/[order_number]/page.tsx` — same shape, duplicated
- `components/admin/TeamSection.tsx` — profiles + auth.users join

## Approach

Four new helpers, then swap the callers. Each helper colocates with
the table it queries:

| Helper | File | What it does |
|---|---|---|
| `adminCounts()` | new `lib/db/dashboards.ts` | Parallel head-count queries for `clients / orders (DM only) / pending proofs / invoices`. Returns a flat `{ clients, orders, pendingProofs, invoices }` object instead of four destructured pairs. |
| `getOrderById(id)` | `lib/db/orders.ts` | Order by primary-key uuid. Narrow column set (no view → no `display_status` case-when) since callers using uuid don't need it. |
| `getOfficeForOrderCard(id)` | `lib/db/offices.ts` | Office subset used by `ClientInfoCard` (name, state, phone, URLs, advisors, return-address jsonb). Exported type `OfficeForOrderCard`. |
| `adminListTeamForClient(clientId)` | `lib/db/profiles.ts` | Profiles for one client, joined with `auth.users` (email/`email_confirmed_at`/`last_sign_in_at`) via the same dynamic `supabaseAdmin` import pattern as `adminListProfiles`. |

## Files

- New: `lib/db/dashboards.ts`
- Edited: `lib/db/orders.ts`, `lib/db/offices.ts`, `lib/db/profiles.ts`
- Edited: `app/admin/page.tsx`, `app/admin/proofs/[id]/upload/page.tsx`, `app/(client)/orders/[order_number]/page.tsx`, `app/admin/orders/[order_number]/page.tsx`, `components/admin/TeamSection.tsx`

## Verification

- `grep -rEn "\.from\('(clients|orders|offices|profiles|proofs|invoices)'" app/ components/` returns zero matches (only `storage.from('proofs')` remains in `ProofUploadForm` — that's a Storage bucket reference, explicitly excluded by the audit)
- `npx tsc --noEmit` clean
- Behavior unchanged on `/admin`, `/admin/clients/<FTA-id>` Team section, and order detail pages
