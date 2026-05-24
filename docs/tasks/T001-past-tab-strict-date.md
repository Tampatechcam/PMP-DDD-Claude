# T001 — Past tab = strict past event date; hide future Order Sent

**Commit:** `accd961` · `fix(orders): Past = past event date only; hide future Order Sent`

## Problem

User screenshot showed the Past events tab listing future-dated rows
(Tue Jun 16/15/9/8, 2026 — all after today). Root cause: the bucket
logic was using `dm_status = 'Order Sent'` as a Past-tab signal too,
so any DM order whose mail had been dropped landed in Past even if the
seminar was still ahead.

## Approach

In [components/orders/OrdersList.tsx](../../components/orders/OrdersList.tsx)
`tabOf()`, replaced the dm-status check with a strict date comparison:

- **Past** = `event_1_date < today`
- **Upcoming** = future event AND `dm_status` doesn't contain "order sent"
- **Hidden** = future event AND Order Sent (the middle bucket — mail
  is out, just waiting on the date)

## Files

- [components/orders/OrdersList.tsx](../../components/orders/OrdersList.tsx) — `tabOf()` rewrite + comment refresh

## Verification

- `/admin?tab=past` rows dropped from 194 → 163 (the 31 mailed-but-not-yet-held orders moved to the hidden bucket)
- `/admin` Upcoming stayed at 13
- Earliest Past row dated 2026-05-19 (before today's 2026-05-23)
