# T005 — 2-col office grid for group clients only

**Commit:** `279f77a` · `feat(clients): 2-col office grid for group clients only`

## Problem

After T004 fleshed out the office cards, group clients (FTA has 10
offices, Sentinel has 3) stretched the detail page over ~10 vertical
screens. User asked for "compact cards in a 2-column grid — same data,
half the vertical space".

## Approach

One conditional Tailwind class on the offices `<ul>` in
[app/admin/clients/[id]/page.tsx](../../app/admin/clients/[id]/page.tsx):

```tsx
<ul className={
  client.is_group
    ? 'grid grid-cols-1 md:grid-cols-2 gap-2'
    : 'space-y-2'
}>
```

Independents (1 office) keep the single-col list because a grid would
just leave half the row empty.

## Files

- [app/admin/clients/[id]/page.tsx](../../app/admin/clients/[id]/page.tsx) — single class swap

## Verification

- `/admin/clients/<FTA-id>` lays out 10 offices in 5 rows × 2 cols (Dallas + FTA on row 1, Maryland + Nashville on row 2…)
- `/admin/clients/<Scout-id>` keeps `space-y-2` single-col
