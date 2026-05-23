/**
 * RLS verification. Signs in as two different test users and asserts that
 * client A cannot read client B's order by guessing UUID.
 *
 * Day 1 nice-to-have, Day 7 requirement (Definition of Done #6).
 */

import 'dotenv/config'

async function main() {
  // 1. Create two test clients + two profiles via the admin client.
  // 2. Sign in as user A; attempt select * from orders where client_id = B.
  // 3. Expect zero rows. Repeat for proofs, invoices, order_events.
  throw new Error('verify-rls not implemented yet')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
