# T007 — Backfill client business/defaults/pricing/notes from Client Dictionary

**Commit:** `6cb4204` · `feat(clients): backfill business/defaults/pricing/notes from Client Dictionary`

## Problem

The four Card sections on the client detail page (Business, Defaults,
Pricing & ops, Notes) were entirely empty — the importer never touched
the matching columns on `clients`. The data exists in
[scripts/.import-work/client-dict.md](../../scripts/.import-work/client-dict.md).

## Approach

One-shot script that parses the dictionary and groups rows by canonical
client name (reusing the `classifyClient` logic from the importer).
For each client, computes the value to write per field:

- **unanimity** for identity fields (business_name, EIN, website) —
  groups whose members disagree get NULL. AdvisorMax members each run
  their own business; the group itself has no canonical business name.
- **modal** for everything else (defaults, mailer rate, etc.)

Fields populated: `business_name`, `business_website`, `ein`,
`ein_match_name`, `is_non_profit`, `responsibility`, `disclaimer`,
`description`, `notes`, `default_mailer_type`, `default_class_type`,
`default_mailing_quantity`, `default_mailer_rate`,
`default_digital_budget`, `tech_sequences`, `direct_mail_discount`,
`start_before_paid`.

## Quirks worked around

- Dictionary file is **two concatenated markdown tables with different
  column orders** (second table's Mailing Quantity moves from col 32
  to col 5). Parser detects each header line and remaps.
- `$.077 / $.075` was being parsed as 77 because the money regex
  `\d+(\.\d+)?` ate "077" first. Switched to `\d*\.\d+|\d+` (prefer
  decimal).
- `Variable` mailing quantity returns NULL, not 0.
- `business_name` falls back to the client's own name when the
  dictionary row is blank (so Andy Urso's "Andy Urso" sticks).

## Files

- New script [scripts/backfill-client-business.ts](../../scripts/backfill-client-business.ts)

## Verification

Covers 14 of 40 clients. The remaining 26 are mostly digital-only solo
advisors that don't appear in the dictionary.

Spot check on FTA: business name "Financial & Tax Architects", rate
$0.077, quantity 7,000, discount 6%, disclaimer renders.
