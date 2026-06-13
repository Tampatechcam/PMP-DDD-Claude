# TASK-R003 — `<Button>` accepts `href`

**Status:** in_progress
**Owner:** claude
**Scope:** UI primitive extension.
**Source:** [002-app-structure-audit.md §Gap-4](002-app-structure-audit.md)

## Problem

Three sites re-implement the `<Button>`'s primary styling
(`bg-accent text-white hover:opacity-90`) inline on a `<Link>` or
`<button type="submit">` because the current Button component only
renders a `<button>`:

- `app/(client)/orders/page.tsx:42` — "New order" Link
- `app/admin/orders/page.tsx:112` — Apply-filter submit button (already a `<button>`, just doesn't use `<Button>`)
- `app/admin/orders/[order_number]/page.tsx:52` — "Upload proof" Link

## Approach

Extend `components/ui/Button.tsx` to accept an optional `href` prop.
When `href` is provided, render `<Link>` (Next.js); otherwise stay a
`<button>`. Same styling, same variant API.

Polymorphic component pattern — discriminated by the presence of
`href`. The button HTML attributes and link href props are union-typed
so TypeScript narrows correctly at each call site.

## Files

- Edit: `components/ui/Button.tsx`
- Edit: `app/(client)/orders/page.tsx` — swap inline Link → `<Button href="/orders/new">`
- Edit: `app/admin/orders/page.tsx` — swap inline submit → `<Button type="submit">`
- Edit: `app/admin/orders/[order_number]/page.tsx` — swap Link → `<Button href={...}>`

## Verification

- `npx tsc --noEmit` clean
- The three sites render identically to before (same colors, same hover, same focus ring)
- `grep -n "bg-accent text-white hover:opacity-90" app/` returns only matches inside `components/ui/Button.tsx`
