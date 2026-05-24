# T019 — Per-invoice detail page

**Source:** [tasks/R010-per-invoice-detail-page.md](../../tasks/R010-per-invoice-detail-page.md) · agent-c TASK-003 Gap #4

## Problem

Four invoice columns from the Part 4.1 schema (`invoiced_dm_rate`,
`invoiced_tech`, `cc_processing`, `fl_state_tax`) were typed in
`InvoiceRow` and surfaced through PostgREST but never rendered. The
list view summarized totals only; there was no per-invoice destination
to see the breakdown.

## Approach

New route `app/admin/invoices/[id]/page.tsx` — Server Component, four
Card blocks (Dates / Line items / Fees / Total), reusing the shared
`<Pill>` primitive for the status badge and `formatMoney` /
`formatEventDate` for cell formatting. The invoices list now links its
Total cell to this new page.

## Files

- New: `app/admin/invoices/[id]/page.tsx`
- Edit: `lib/db/invoices.ts` — `adminGetInvoice(id)`
- Edit: `app/admin/invoices/page.tsx` — Total cell `<Link>` to detail

## Verification

- `npx tsc --noEmit` clean
- Route renders Card blocks even when source columns are null (em-dash fallbacks)
- Visual verification deferred: 0 invoices in the DB today; the route will exercise once invoicing flow runs
