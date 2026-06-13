# T018 — Date-range + `display_status` filters on `/admin/orders`

**Source:** [tasks/R008-admin-orders-date-status-filters.md](../../tasks/R008-admin-orders-date-status-filters.md) · agent-c TASK-003 Gap #2 + #3

## Problem

Plan called for "global orders filter (client, **status, date range**)".
The shipped filter row covered Client × Class × Type × free-text but
left out status + date — meaningful gaps when FTA alone has 173+ orders
and ops asks questions like "May 2026 events that still need details
added".

## Approach

### Helper changes — `lib/db/orders.ts`

`adminListOrders` gained three optional params: `from?: string`,
`to?: string`, `displayStatus?: string`. Composed as
`.gte('event_1_date', from)` / `.lte('event_1_date', to)` /
`.eq('display_status', displayStatus)`. `display_status` is on the
view from migration 012 so no schema change needed.

New `adminDistinctOrderStatuses()` helper returns the sorted set of
status values actually seen in the data — feeds the status dropdown
so it stays accurate as `dm_status` / `digital_status` drift.

### UI changes — `app/admin/orders/page.tsx`

- Two `<input type="date">` controls (`from` / `to`) — native pickers, no JS
- One `<select name="status">` populated from `adminDistinctOrderStatuses()`
- All three round-trip through the URL via the existing `method="get"` form
- All three added to `preserveParams` so tab links keep the filters

New tiny `DateFilter` helper mirrors the existing `SelectFilter` shape.

## Files

- [lib/db/orders.ts](../../lib/db/orders.ts) — `adminListOrders` signature + `adminDistinctOrderStatuses`
- [app/admin/orders/page.tsx](../../app/admin/orders/page.tsx) — form fields + searchParams + preserveParams

## Verification

- `/admin/orders` renders the three new form fields
- `/admin/orders?from=2026-06-01&to=2026-06-30` → 52 June events, 0 July events (filter cuts at the inclusive ceiling)
- `/admin/orders?status=Order%20Sent` → only Order-Sent orders in the table
- `/admin/orders?tab=past&from=2026-05-15&to=2026-05-20` → 26 in-range matches, no May 22+ events
- Clearing via "Clear filters" wipes all 7 params (client, class, needs, q, from, to, status)
- `npx tsc --noEmit` clean
