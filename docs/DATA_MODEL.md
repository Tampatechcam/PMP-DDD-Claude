# Data model

The authoritative description of every table is the migration that created it
(`supabase/migrations/`). This doc is for shape and intent, not column lists.

## Entities

```
clients ──< offices
   │           │
   │           └──< orders (office_id, optional)
   │                  │
   ├──< venues ──< buildings ──< rooms
   │                  ▲                ▲
   │                  │                │
   │             orders.venue_id   orders.room_id
   │
   └──< orders ──< proofs
                   └──< invoices
                   └──< order_events  (audit log)
auth.users 1:1 profiles ─▶ clients   (which client this user can see)
```

- **`clients`** — the login entity. An FMO is a client; a stand-alone firm is
  also a client. `is_group = true` for FMOs.
- **`offices`** — locations / advisors under a client. Multi-office clients see
  an office switcher; single-office clients never see it.
- **`profiles`** — one row per `auth.users` row, created by the
  `handle_new_user` trigger. `role in ('client','admin')`.
  `client_id` is `null` for admins.
- **`orders`** — one row per Order Number. `client_id` is required. Up to 4
  events per order at the same venue; status fields are kept separate
  (`main_status`, `dm_status`, `digital_status`, `invoice_status`).
- **`proofs`** — one row per uploaded version. PDF lives in Storage at
  `proofs/{client_id}/{order_number}/{version}.pdf`. Status moves
  `pending → approved | revision_requested`.
- **`invoices`** — admin-only. Clients do not read this table in v1.
- **`order_events`** — append-only audit log. Insert a row whenever an order
  changes hands: created, proof uploaded, proof decided, status flipped.

## Status is derived, not stored

The card-level "display status" comes from `orders_with_display_status`, a
view that collapses dm/digital/main/proof state into one string. The UI never
recomputes this. If a status rule changes, the view changes.

## Two views, two reasons

- `orders_with_display_status` — to avoid recomputing status everywhere.
- `client_self_view` — to prevent `select *` from leaking internal client
  fields (responsibility, mailer rate, discount, tech sequences). Client UI
  reads this view; admin UI reads the base table.

## What's intentionally simple

- No separate `events` table — up to 4 are columns on `orders`. PMP doesn't
  run more than 4 per order today, and the cardinality stays static.
- Address is `jsonb` rather than its own table — we never query by city/state
  and the import data is messy free text.
- Venue/building/room are nullable on `orders`; `venue_text` and
  `venue_address_text` capture the free-text case from the imported sheets.
