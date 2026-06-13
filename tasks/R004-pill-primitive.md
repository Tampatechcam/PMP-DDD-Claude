# TASK-R004 — Extract shared `<Pill>` primitive

**Status:** in_progress
**Owner:** claude
**Scope:** UI primitive de-duplication.
**Source:** [002-app-structure-audit.md §H + §Gap-5](002-app-structure-audit.md)

## Problem

Two near-identical pill implementations:

- `components/orders/StatusPill.tsx` — maps a free-text `status` string
  to one of four tones (complete / pending / awaiting / revision) via
  the `statusTone()` keyword classifier. Renders a tinted background
  + bordered pill.
- `app/admin/invoices/page.tsx:98-108` — its own `InvoiceStatus` pill
  using the same emerald/amber/stone Tailwind palette plus its own
  classifier.

## Approach

New `components/ui/Pill.tsx` exposing:

```tsx
type PillTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent'
<Pill tone="success">{children}</Pill>
```

Tone → Tailwind class lookup lives in the primitive, so neither caller
hand-rolls colors. Both `StatusPill` and `InvoiceStatus` become small
wrappers that just compute a tone from their status string and pass
children.

## Files

- New: `components/ui/Pill.tsx`
- Edit: `components/orders/StatusPill.tsx` — keep the file + the
  keyword classifier (`statusTone`) but render `<Pill tone={...}>` instead
  of bespoke markup
- Edit: `app/admin/invoices/page.tsx` — replace inline `InvoiceStatus`
  with a small inline classifier + `<Pill>`

## Verification

- `grep -rn "px-2 py-0.5 text-xs.*rounded.*bg-" components/ app/` should
  return at most one match (the Pill itself) — no other rendering of the
  same shape
- `npx tsc --noEmit` clean
- Status pills on /admin?tab=past, order detail header, /admin/invoices
  all render identically to before
