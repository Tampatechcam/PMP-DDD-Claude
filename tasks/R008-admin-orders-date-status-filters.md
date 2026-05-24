# TASK-R008 — Date-range + `display_status` filters on `/admin/orders`

**Status:** in_progress
**Owner:** claude
**Scope:** Day-7 "global orders filter (client, status, date range)" spec line.
**Source:** [003-day-7-status.md Gap #2 + #3](003-day-7-status.md)

## Problem

The global filter at `/admin/orders` covers Client × Class × Type ×
free-text search but **misses two of the four filters the plan named**:

- **Date range** — Plan says "(client, status, **date range**)". With
  173+ orders for FTA alone, "show me orders in Jan 2026" is a real
  ops need.
- **Status** — Plan names "status" explicitly. Currently you can only
  reach past events via the `?tab=past` sidebar link; can't filter to
  "Awaiting Your Approval" or "Order Sent" from the global list.

## Approach

1. **Filter UI** — extend the form in `app/admin/orders/page.tsx`:
   - Two `<input type="date">` controls (`from` / `to`) — native date pickers, no JS
   - One `<select>` for `display_status` populated with distinct
     statuses observed in the data (derive from `adminListOrders` results
     so the dropdown stays accurate when statuses drift)
2. **Filter implementation** — extend `lib/db/orders.ts:adminListOrders`:
   - Accept `from?: string`, `to?: string`, `displayStatus?: string`
   - Compose `.gte('event_1_date', from)` / `.lte('event_1_date', to)`
   - Compose `.eq('display_status', displayStatus)` (the view already
     surfaces this column post-migration-012)
3. **URL convention** — `?from=2026-01-01&to=2026-01-31&status=Order%20Sent` — same `method="get"` form pattern as the existing filters so address-bar = state of truth.
4. **Preserve in tab links** — `preserveParams` on `<OrdersList>` already forwards arbitrary query params; just add the new ones to the dict.

## Files

- `app/admin/orders/page.tsx` — form fields + searchParams pass-through
- `lib/db/orders.ts` — adminListOrders signature + filter composition

## Verification

- `/admin/orders?from=2026-05-01&to=2026-05-31` shows only orders whose `event_1_date` is in May 2026
- `/admin/orders?status=Order%20Sent` shows only Order-Sent orders
- Filters compose (date AND client AND status all together)
- Clearing one filter via the "Clear filters" link wipes everything
- `npx tsc --noEmit` clean
