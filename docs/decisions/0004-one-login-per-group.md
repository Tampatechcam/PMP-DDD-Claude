# 0004 — One login per group, multi-office UX in the URL

**Status:** Accepted · 2026-05-23

## Context

Some clients are FMOs with multiple offices (FTA: St. Louis, STL SS,
Southern Illinois, Rolling Meadows, Oak Brook, Dallas, Nashville;
Sentinel/SAM RIA: CT/MD/PA). Other groupings in the sheet — AdvisorMax,
Arrive Financial — needed confirmation: are they true groups with one
shared login, or independent firms grouped operationally?

## Decision

- **Group clients (one `clients` row, one login):**
  - FTA — seven offices.
  - Sentinel / SAM RIA — CT, MD, PA.
  - **AdvisorMax** — Christian Baldino, Andy Urso, Albert Stout,
    Sean O'Toole become offices under one shared AdvisorMax client.
- **Independent firms (one `clients` row per advisor, one login each):**
  - **Arrive Financial** — Brad Evans, JoAnn Roach, Kim Edwards,
    Whitney Ross, Eladio Montelongo, Ariel Gonzalez each get their own
    `clients` row.

The office switcher only appears when `clients.is_group = true`. Active
office state lives in `?office=<id>`; Server Components own the filtering.
Refresh-safe, deep-linkable, no `useState` flicker.

## Consequences

- Group admins see "All offices" plus one office at a time, with the same
  data underneath. Bookmarks work.
- Arrive Financial advisors each manage their own sign-in. We do not
  promise them a unified view of the others' orders.
- AdvisorMax advisors all share one login and see each other's orders. If
  that turns out to be wrong operationally, the fix is to split them out
  into their own `clients` rows — not pleasant but reversible (update
  `client_id` on the affected orders + profiles).

## What this locks in for the import

`scripts/import-sheets.ts`:

1. **FTA, Sentinel/SAM RIA, AdvisorMax** — one `clients` row each,
   `is_group = true`, rows under them become `offices`.
2. **Arrive Financial** — six independent `clients` rows, one per advisor,
   `is_group = false`.
3. Everyone else — one row in the dictionary = one client + one implicit
   primary office.
