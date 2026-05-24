# T008 — Dissolve AdvisorMax group; Andy Urso becomes own client

**Commit:** `27fa540` · `feat(clients): dissolve AdvisorMax group, Andy Urso becomes own client`

## Problem

User direction: "Put Andy Urso put the company as Andy Urso as well
as just merge and any other AdvisorMax advisor becomes independent."

State before: AdvisorMax was a group client holding 1 office + 4
orders (all `advisor_name = 'Andy Urso'`). The other AdvisorMax
members (Christian Baldino, Albert Stout, Sean O'Toole, Knoxville,
etc.) were already independent clients — only Andy was still
aggregated, because an `ADVISOR_TO_GROUP_OVERRIDE` in the importer
explicitly forced him under AdvisorMax.

## Approach

One-shot SQL transaction:

1. `INSERT INTO clients (name='Andy Urso', is_group=false, business_name='Andy Urso', …)` with the rest of his dictionary fields
2. `UPDATE offices SET client_id = (Andy Urso id) WHERE client_id = (AdvisorMax id)`
3. `UPDATE orders SET client_id = (Andy Urso id) WHERE client_id = (AdvisorMax id)` (4 rows)
4. `DELETE FROM clients WHERE name = 'AdvisorMax'`

Plus source-code patches so re-imports don't recreate AdvisorMax:

- [scripts/import-v2.ts](../../scripts/import-v2.ts): drop the
  `ADVISOR_TO_GROUP_OVERRIDE` entry for Andy Urso, drop the AdvisorMax
  classification branch in `classifyClient`, remove AdvisorMax from
  `GROUP_CLIENT_NAMES`
- [scripts/backfill-client-business.ts](../../scripts/backfill-client-business.ts):
  AdvisorMax dictionary rows now resolve to the per-advisor
  independent client (with `Sean O'Toole` aliased to `The O'Toole
  Group` since that's where his orders live). `business_name` falls
  back to the client's own name when the dictionary row is blank, so
  Andy Urso's Business card stays populated through re-runs.

## Files

- [scripts/import-v2.ts](../../scripts/import-v2.ts)
- [scripts/backfill-client-business.ts](../../scripts/backfill-client-business.ts)

## Verification

- clients count: 40 → **40** (one created, one deleted)
- orders count: 325 → **325** (unchanged)
- AdvisorMax no longer exists in `clients`
- Andy Urso client renders `business_name = 'Andy Urso'`,
  responsibility Chad, class type Retirement 101, qty 7000, budget
  $1,700, disclaimer text from dictionary
