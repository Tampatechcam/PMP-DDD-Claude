# T003 — `DIG-NNN` display_ref for digital-only orders

**Commit:** `b621aca` · `feat(orders): DIG-NNN display_ref for digital-only orders`

## Problem

Digital-only orders had synthetic integer `order_number` values
(`968`-`1085`) — the importer minted them post-hoc to satisfy
`orders.order_number NOT NULL UNIQUE` because the Digital Jobs sheet
has no order-number column. UI couldn't tell them apart from real DM
orders. The user explicitly flagged this with "did you just assign
random numbers to all digital orders?".

## Approach

New `orders.display_ref text` column.

- NULL for DM orders → UI falls back to `#` + `order_number`
- `DIG-001` … `DIG-118` for digital-only rows, assigned in
  `order_number` order via `row_number() OVER (ORDER BY order_number)`

Route slugs accept either an integer or `DIG-NNN`:

```ts
// lib/db/orders.ts
export async function getOrderByRef(ref: string) {
  if (/^\d+$/.test(ref)) return /* lookup by order_number */
  return /* lookup by display_ref */
}
```

New presentation helpers `orderHref(o, basePath)` + `orderLabel(o)`
centralize the `display_ref ?? '#' + order_number` decision so every
call site uses the same fallback.

## Files

- New migration [supabase/migrations/20260523000012_display_ref.sql](../../supabase/migrations/20260523000012_display_ref.sql) — adds column + index, recreates `orders_with_display_status` view (the existing `select o.*` needed re-expansion to pick up the new column position)
- [lib/db/orders.ts](../../lib/db/orders.ts) — `display_ref` on `OrderRow`; new `getOrderByRef`
- [lib/utils/format.ts](../../lib/utils/format.ts) — `orderHref` + `orderLabel`
- [components/orders/OrdersList.tsx](../../components/orders/OrdersList.tsx), [components/orders/OrderCard.tsx](../../components/orders/OrderCard.tsx), [app/admin/clients/[id]/page.tsx](../../app/admin/clients/[id]/page.tsx), [app/admin/invoices/page.tsx](../../app/admin/invoices/page.tsx), [app/admin/proofs/[id]/upload/page.tsx](../../app/admin/proofs/[id]/upload/page.tsx) — all swapped to use the helpers
- [components/proofs/ProofUploadForm.tsx](../../components/proofs/ProofUploadForm.tsx) — prop renamed `orderNumber` → `orderLabel`
- [lib/actions/proofs.ts](../../lib/actions/proofs.ts) — redirect after upload uses `display_ref ?? order_number`
- [lib/db/invoices.ts](../../lib/db/invoices.ts) — pulls `display_ref` on the joined order row

## Verification

- `/admin/orders/DIG-001` resolves and renders "Order DIG-001 · …"
- `/admin/orders/651` still resolves and renders "Order #651 · …"
- Sentinel/SAM RIA detail page shows 22 DM (`#NNN`) + 3 digital (`DIG-NNN`) intermixed
- `/admin?tab=past` still shows 163 DM rows with `#NNN` labels (digital-only orders don't bucket into the tabs anyway)
- `npx tsc --noEmit` clean

## Decisions kept implicit

- Storage paths in proofs still use the integer `order_number` — opaque keys, changing them would break existing PDFs in Supabase Storage
