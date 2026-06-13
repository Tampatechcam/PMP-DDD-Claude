# T020 — Remove unused order-form fields

**Date:** 2026-06-13
**Branch:** `feature/remove-unused-order-fields` (cut from `main`)
**Author:** Cam Hebeler + Claude (Opus 4.8)

## What

Removed four inputs from the order forms and stopped persisting them via the
create/update server actions:

- `market`
- `time_notes`
- `sending_list_folder_url`
- `qr_code_link`

## Why

Per Cam: these fields were unused noise on the order-entry forms. They added
friction without being acted on downstream. Removing the **inputs** declutters
both the admin and client order forms.

## Scope — deliberately "form inputs only"

The DB columns, import scripts, search, and display surfaces were left intact.
This was a conscious decision because the fields are woven through the stack:

- `market` is **load-bearing** — it backs order **search** (`lib/db/orders.ts`,
  `lib/actions/search.ts`) and is the **display fallback** when an order has no
  venue (`OrdersList.tsx`, `SelectableOrdersTable.tsx`, `AdminAttention.tsx`).
  Dropping the column would break search and several list views.
- `time_notes`, `sending_list_folder_url`, `qr_code_link` are displayed on
  `OrderCard.tsx` and populated by the import scripts (`import-real.ts`,
  `import-v2.ts`, `sync-from-sheet.ts`) from the source sheets.

So: remove the data-entry surface, keep the columns and historical data.

## Approach

1. Cut `feature/remove-unused-order-fields` from `main`.
2. Removed the four `<Input>` elements from:
   - `components/admin/AdminOrderForm.tsx`
   - `components/orders/OrderForm.tsx` (client-facing; uses the same `createOrder`)
3. Removed the four keys from BOTH the create and update payloads in
   `lib/actions/orders.ts`. Removed (not set to `null`) so editing an existing
   order leaves any historical `market` value untouched rather than wiping it.

## Files changed

```
components/admin/AdminOrderForm.tsx   — removed market, time_notes, sending_list_folder_url, qr_code_link inputs
components/orders/OrderForm.tsx       — same four inputs removed
lib/actions/orders.ts                 — stopped reading/writing the four fields in createOrder + updateOrder
```

## Verification

- Grep confirms zero residual `name="..."` or `form, '...'` references to the
  four fields in the three changed files.
- The client `OrderForm` and admin `AdminOrderForm` both submit through the same
  `createOrder` action, so the action change covers both.
- `npm run typecheck` to be run post-commit (see note on tooling below).

## Tooling note — sandbox/mount corruption workaround

The Cowork sandbox writes to the repo over a Windows mount that intermittently
appends **null-byte padding** to files on write, which made `tsc` report
"Invalid character" / "Unterminated string literal" on files that were actually
fine in the git object store. A regenerating ghost `.git/index.lock` also blocked
all index operations from the sandbox.

To get clean edits in despite this, the three files were rebuilt from their clean
`main` blobs in sandbox-local `/tmp` (CR-stripped), edited there, and hashed into
the git object store with `git hash-object -w`. The resulting blob SHAs were then
staged from PowerShell (where the lock clears) via `git update-index --cacheinfo`.

Clean blob SHAs (already in the object store):

```
lib/actions/orders.ts               fc41185b60dd5778d28718da4bc29dca33de9e65
components/admin/AdminOrderForm.tsx  0ce2784fe059f999c7473594bef7546b240c37a7
components/orders/OrderForm.tsx      d942ef5739f0b47336392c0f9381903f1262f64c
```

Also set `git config core.autocrlf false` to stop CRLF re-introduction.

## Follow-ups / not done

- DB columns `market`, `time_notes`, `sending_list_folder_url`, `qr_code_link`
  remain. If a future cleanup wants them gone, it needs a migration AND a rewrite
  of the search/fallback logic that depends on `market`.
- Push + PR back into `main` per branch protocol.
