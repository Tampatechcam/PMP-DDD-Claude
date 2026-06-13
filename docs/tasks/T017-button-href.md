# T017 — `<Button>` accepts `href` (renders as Link)

**Source:** [tasks/R003-button-href.md](../../tasks/R003-button-href.md) · agent-b TASK-002 Gap #4

## Problem

Three pages re-implemented the Button component's primary styling
inline on a `<Link>` or `<button>` because the existing Button only
rendered a `<button>` element:

- `app/(client)/orders/page.tsx:42` — "New order" Link
- `app/admin/orders/page.tsx:112` — Apply-filter submit
- `app/admin/orders/[order_number]/page.tsx:52` — "Upload proof" Link

Each one was a 1-2 line drift away from accidentally going out of sync
with the canonical styling.

## Approach

Polymorphic Button discriminated on `href`:

- With `href` → renders `<Link>` (Next.js)
- Without → renders `<button>`

Discriminated-union props in TypeScript so each call site narrows
correctly (anchor attrs vs button attrs). The shared styling lives in
one place; variant API and `fullWidth` work for both shapes.

## Files

- Edit: `components/ui/Button.tsx` (signature change)
- Edit: `app/(client)/orders/page.tsx`, `app/admin/orders/page.tsx`, `app/admin/orders/[order_number]/page.tsx` — swap inline Link/button to `<Button>`

## Verification

- `npx tsc --noEmit` clean
- `grep -rn "bg-accent text-white hover:opacity-90" app/ components/` returns only the canonical line inside `components/ui/Button.tsx`
- All three sites render with the exact same Tailwind classes as before
