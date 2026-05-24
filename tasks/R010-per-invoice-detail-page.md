# TASK-R010 — Per-invoice detail page

**Status:** complete
**Owner:** claude
**Scope:** UI / route addition.
**Source:** [003-day-7-status.md Gap #4](003-day-7-status.md)

## Problem

The list view at `/admin/invoices` summarized each invoice to a single
row (Order link · Status · Sent date · Paid date · DM · Digital · Total)
but four invoice columns from Part 4.1 were typed in `InvoiceRow` and
never shown anywhere: `invoiced_dm_rate`, `invoiced_tech`,
`cc_processing`, `fl_state_tax`.

## Approach

New route at `app/admin/invoices/[id]/page.tsx` — full breakdown in
four cards (Dates / Line items / Fees / Total). Server Component;
fetches via new `adminGetInvoice(id)` helper in `lib/db/invoices.ts`.

The list view's Total cell now links into the detail page so the user
can navigate without manually constructing the URL.

## Files

- New: `app/admin/invoices/[id]/page.tsx`
- Edit: `lib/db/invoices.ts` — added `adminGetInvoice(id: string)`
- Edit: `app/admin/invoices/page.tsx` — wrap Total cell in `<Link>` to detail

## Verification

- `npx tsc --noEmit` clean
- No invoices currently in the DB (`count = 0`) so visual verification
  deferred to when the first invoice lands — but the route compiles
  with the same `InvoiceRow` type the list page uses
