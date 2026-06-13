/**
 * One-shot importer for the five PMP Sheets. Run with the service-role key.
 * After a successful run + archive, DELETE this file (see Part 12).
 *
 * Usage:
 *   tsx scripts/import-sheets.ts --in ./sheets/*.csv
 *
 * Day 3 deliverable — see Part 12 for the join logic.
 *
 * Grouping decisions (locked via ADR 0004 — do not re-litigate):
 *   - Groups (is_group = true, one clients row + offices):
 *       FTA, Sentinel/SAM RIA, AdvisorMax
 *   - NOT groups (one clients row per advisor):
 *       Arrive Financial
 *   - Everyone else: one row in the Client Dictionary = one client +
 *     one implicit primary office.
 */

import 'dotenv/config'

async function main() {
  // Steps:
  //   1. Clients + Offices from Client Dictionary
  //   2. Venues from Creative Dictionary (+ orders)
  //   3. Orders — join Main + DM + Digital + Invoice on order_number
  //   4. Append {order_number, action, warnings} to scripts/import-log.jsonl
  //   5. Verify via SQL queries in Part 12.5
  throw new Error('import-sheets not implemented yet')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
