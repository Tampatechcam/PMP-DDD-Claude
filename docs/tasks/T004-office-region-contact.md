# T004 — Region + contact info on each office card

**Commit:** `106e067` · `feat(clients): region + contact info on each office card`

## Problem

Office cards on the client detail page showed only name + advisors +
(always-null) registration_phone. User wanted state badge + phone +
landing URL + return address per office. The data existed in `orders`
rows but had never been promoted to the office level.

## Approach

Tiny migration adds `offices.state text`. One-shot Node script
aggregates the four fields per office from data we already have:

| Field | Source |
|---|---|
| `state` | Regex `, ST 12345` over `orders.venue_address_text` (modal per office) |
| `registration_phone` | Re-parsed from the DM CSV (the importer was reading the column and discarding it — no orders column for it) |
| `registration_url_direct` | Modal `orders.landing_page_url_direct` |
| `mailer_return_address` (jsonb) | Modal `orders.mailer_return_address_override` |

Aggregation in Node (not SQL) because the regex + modal logic was
easier to express + audit, and the result is one UPDATE per office.

## Files

- New migration [supabase/migrations/20260523000013_office_state.sql](../../supabase/migrations/20260523000013_office_state.sql)
- New script [scripts/backfill-office-fields.ts](../../scripts/backfill-office-fields.ts) — idempotent
- [app/admin/clients/[id]/page.tsx](../../app/admin/clients/[id]/page.tsx) — office card markup: state pill on the right of the name; phone/URL/address in a dl below advisors, each row hidden when the field is null

## Verification

After backfill:
- 54/54 offices have `state` (every office has at least one venued order)
- 24/54 have phone + URL + return address (the DM-touched offices; the 30 digital-only offices have no source for those)

Spot check on FTA:

| Office | State | Phone | Landing URL |
|---|---|---|---|
| Dallas · primary | TX | (469) 916-2591 | fta-ria.com/dallas101 |
| Nashville | TN | (629) 247-4404 | fta-ria.com/nashville101 |
| Oak Brook | IL | (630) 556-8872 | fta-ria.com/chicago101 |
| Rolling Meadows | IL | (847) 994-3538 | fta-ria.com/chicago101 |
| St. Louis | MO | (314) 579-3655 | fta-ria.com/stlouis101 |

## Follow-up

The importer still discards `Registration Phone Number` and doesn't
populate the office-level fields on insert — tracked under task #4.
