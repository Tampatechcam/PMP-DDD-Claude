# T016 — Extract shared `<Pill>` primitive

**Source:** [tasks/R004-pill-primitive.md](../../tasks/R004-pill-primitive.md) · agent-b TASK-002 Gap #5

## Problem

Two pill implementations were diverging:

- `components/orders/StatusPill.tsx` — order status pill with leading dot
- `app/admin/invoices/page.tsx` — `InvoiceStatus` pill, same shape + same tones, no dot

Each carried its own `bg-emerald-50 / amber / stone` palette inline.
Future tone additions or palette tweaks would have to happen twice.

## Approach

New `components/ui/Pill.tsx` exposing the primitive:

```tsx
<Pill tone="success" withDot>...</Pill>
```

`tone: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'`.
`withDot` is opt-in (defaults to false to keep the simpler invoices use
case minimal). Tone → Tailwind class lookup lives in the primitive so
neither caller hand-rolls colors.

Both call sites become tiny:

- `StatusPill` is now 7 lines — just runs the status through `statusTone()`
  and forwards to `<Pill withDot>`
- `InvoiceStatus` is 9 lines — picks the tone from `paid` / "sent" /
  default and forwards to `<Pill>`

## Files

- New: `components/ui/Pill.tsx`
- Edit: `components/orders/StatusPill.tsx`
- Edit: `app/admin/invoices/page.tsx`

## Verification

- `npx tsc --noEmit` clean
- The status pill rendering is identical to before (same Tailwind
  classes; just behind one layer of indirection)
- The accent tone is new (didn't exist before) — available for future
  callers but not used yet
