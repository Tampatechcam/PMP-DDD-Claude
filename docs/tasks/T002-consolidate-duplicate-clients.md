# T002 — Consolidate digital-sheet duplicate clients into their firms

**Commit:** `09872c5` · `chore(data): consolidate digital-sheet duplicate clients into their firms`

## Problem

Several advisors appeared as their own client because the Digital
Jobs sheet (`scripts/.import-work/digital-jobs.md`) left `Group Name`
blank, while the DM sheet had them correctly grouped. The clients tab
showed 48 rows — many of them duplicates of the same advisor under
their firm.

## Approach

One transactional script
([scripts/consolidate-clients.ts](../../scripts/consolidate-clients.ts))
that:

1. UPDATEs orders to re-point `client_id` from the orphan to the canonical client
2. UPDATEs office `client_id` similarly
3. DELETEs the orphan client row

| Orphan → canonical | Orders moved |
|---|---|
| FTA NSV → FTA | 8 |
| David Jones → FTA | 2 |
| William Warner → Sentinel/SAM RIA | 3 |
| Sean Mason → Mason Street Wealth Management | 1 |
| Jason Smitka → Scout Financial Group | 2 |
| Alan Johnson → Professional Group, Inc. | 1 |
| Catherine Loquet → Advanced Wealth Management | 2 |
| Lawrence → John Lawrence | 3 |

Plus advisor-name normalization: `FTA Chicago` → `FTA CHI` on 4 orders
+ 2 offices (using `array_agg(DISTINCT)` to dedupe the offices arrays).

## Files

- [scripts/consolidate-clients.ts](../../scripts/consolidate-clients.ts) — idempotent one-shot

## Verification

- clients count: 48 → **40**
- orders count: 325 → **325** (unchanged — UPDATEs only)
- FTA orders: 163 → **173** (+8 NSV +2 DJ)
- `advisor_name = 'FTA Chicago'` rows: 0
- FTA detail page shows the 7 canonical advisor labels (FTA STL, FTA CHI, FTA NSV, FTA TX, FTA STL SS, David Jones, Justin Yoo)

## Follow-up

The Digital-sheet drift will recur on a re-import — tracked under task #4 (patch import-v2.ts).
