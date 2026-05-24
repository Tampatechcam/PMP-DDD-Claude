# T006 — Use tabbed OrdersList on the client detail page

**Commit:** `ff62cd8` · `feat(clients): use the tabbed OrdersList table on the client detail page`

## Problem

The client detail page's "Recent orders" section was a hand-rolled
list (Order# + class chip, date, status pill) that didn't match the
Upcoming/Past tabbed table on `/admin`. User wanted the same view.

## Approach

Replace the bespoke list with `<OrdersList>` scoped to this client.

- New `searchParams: { tab?: string }` on the page so per-client
  deep links work: `/admin/clients/<id>?tab=past`
- `adminListOrders` limit bumped 25 → 500 (FTA already has 173 orders;
  OrdersList does the Upcoming/Past bucketing client-side after fetch)
- `showClient={false}` since we're already on a client page
- `basePath` set to `/admin/clients/{id}` so tab links stay on this page

## Files

- [app/admin/clients/[id]/page.tsx](../../app/admin/clients/[id]/page.tsx)

## Verification

- HTML check on FTA confirms the table renders with the right column set (Order, First/Second Event Date, Advisor, Venue, Status — no Client column) and the Upcoming/Past tabs
- Tabs preserve `?tab=` in the URL for shareable deep links
