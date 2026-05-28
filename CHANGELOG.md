# Changelog

All notable changes to this project. Update the `## Unreleased` block in
every PR that lands a user-visible or operationally relevant change.

## Unreleased

### Added
- **Admin "view portal as client" (impersonation):** a "View portal as
  client" button on `/admin/clients/[id]` sets a server-only,
  httpOnly cookie (`pmp_view_client`) and drops the admin into the
  client shell scoped to that client. A persistent warning banner at
  the top of the client shell shows whose portal is being viewed and
  carries an "Exit to admin" button. The client-shell readers
  (`listOrdersForClient`, `listVenuesForCurrentClient`,
  `listOfficesForCurrentClient`, `getCurrentClientSelf`, the venue
  quick-fill from past orders, `getOrderByRefForClient`) explicitly
  filter by the impersonated client_id so admin RLS — which would
  otherwise return every client's rows — narrows to the one being
  viewed. `getCurrentClientIdOrThrow` returns the impersonated id too,
  so orders / venues created while viewing-as get attributed to the
  viewed client. The client layout fails closed: an admin who reaches
  `/orders` without setting the cookie is bounced to `/admin`.
  Non-admins who forge the cookie are ignored
  (`getImpersonatedClientId` re-checks `role === 'admin'` server-side
  on every request); RLS remains the hard boundary.
- Initial repo scaffold: Next.js App Router, Tailwind, Supabase client trio,
  middleware, route-group layouts for `(auth)`, `(client)`, and `app/admin/`.
- Schema migrations 001–006: tables, triggers, RLS helpers, RLS policies,
  display views, Storage bucket + policies.
- ADRs 0001, 0002, 0004, 0005, 0006, 0007 accepted. ADR 0003 (magic-link
  only) rejected and superseded by 0006 (password + magic-link).
- Docs skeleton: ARCHITECTURE, DATA_MODEL, AUTH, DEPLOYMENT, RUNBOOK, TODO.
- `.cline/rules.md` and `CONTRIBUTING.md`.
- Import + RLS-verification script stubs.
- **Auth UI (Day 2):** login page with both password and magic-link paths,
  account page with password set/change, sign-out button wired into both
  shell layouts, and `lib/actions/auth.ts` for sign-in / sign-out /
  password update. Generic error copy on the login form to avoid
  user-enumeration via auth errors.
- `components/ui/Button.tsx`, `Input.tsx`, and `Card.tsx` — primitives
  shared by every form and panel going forward.
- **Venues UI (Day 3):** `/venues` page lists every venue with its
  buildings and rooms. Inline forms to add a venue, a building under
  a venue, or a room under a building. Delete cascades through the
  FK chain. `lib/db/profiles.ts` factors out the current-client lookup
  that mutating actions need to satisfy the RLS with-check.
- **Orders list + card (Day 4):** `/orders` sorts by `event_1_date`
  desc (the SQL view does the sort), with an `OfficeSwitcher` for
  group clients that hides itself for single-office clients. State
  lives in `?office=<id>` — server components own the filtering, no
  client state. `/orders/[order_number]` renders the Part 8 ASCII
  layout as a Server Component: header + Status pill, Events, Venue,
  Direct Mail (only if `needs_direct_mail`), Digital (only if
  `needs_digital`), Proofs, History.
- `components/orders/StatusPill.tsx` maps the SQL view's display
  string to one of four tones via `lib/utils/status.ts`.
- **Order form (Day 5):** `/orders/new` renders Part 7 as a single
  long form. Direct Mail and Digital blocks only appear when their
  checkbox is on, so a digital-only order doesn't get noisy mailing
  fields. Cascading venue picker (venue → building → room) is fed
  by a pre-fetched tree so it stays a Client Component with no
  fetching of its own. Office field appears only for group clients
  and defaults to the office switcher's current value. Up to 4
  events, added one at a time. `createOrder` picks the next order
  number with a max+1 retry loop (good enough for human-scale
  concurrency; a Postgres sequence is the eventual fix) and
  appends an `Order created` row to `order_events`.
- **Proofs (Day 6):** admin uploads at `/admin/proofs/[order_id]/upload`
  via the direct-to-Storage flow from ADR 0005 — the browser PUTs the
  PDF straight to Supabase Storage with a signed upload URL; the
  Server Action only mints the URL, then records the `proofs` row
  and an audit event. Clients see Approve / Request revision /
  View PDF on every proof, and a typed reason is required before a
  revision request goes out so the next round has something to act
  on. `View PDF` opens a 10-minute signed download URL in a new tab.
- **Admin views (Day 7):** `/admin` dashboard with three quick tiles
  (clients, orders, proofs awaiting client). `/admin/clients` and
  `/admin/clients/[id]` render the static client info panel — all
  the internal fields (responsibility, mailer rate, discount,
  tech sequences) that `client_self_view` strips for client UI.
  `/admin/orders` is the global filter (client × class × type ×
  free-text search) with state in the URL. `/admin/orders/[order_number]`
  reuses the OrderCard plus an Upload-proof CTA. `/admin/invoices`
  lists every invoice with totals.

- **RLS verification (Part 17 DoD #6):** `scripts/verify-rls.ts`
  provisions two throw-away clients + users, signs in as user A,
  and asserts A cannot read B's order by UUID, cannot update B's
  order, cannot read B's events / proofs / invoices. Tears down
  whether the assertions pass or fail. `npm run verify:rls`.
- **Demo sign-in:** `lib/actions/demo.ts` + Demo: Client / Demo: Admin
  buttons on `/login`. Provision idempotent demo accounts and a seed
  order via the service-role client. Marked for deletion before
  production.

### Fixed
- `lib/actions/orders.ts` — `createOrderAsAdmin` was casting the insert
  result with `data as typeof inserted`, which `tsc` (post-`as const`
  payload narrowing) treated as a `never`-overlap conversion and
  flagged across 4 lines. Replaced with a named `InsertedAdminRow`
  type alias + `as unknown as InsertedAdminRow`. Repo back to clean
  `tsc --noEmit`.
- `components/ui/Input.tsx` — replaced an ad-hoc module-level ID
  counter with `useId()`. The counter generated different sequences
  on server vs client and tripped React's hydration mismatch warning
  on the login page.
- `lib/supabase/server.ts` + `middleware.ts` — typed `setAll`'s
  parameter explicitly so the repo passes `tsc --noEmit` and stays
  inside the "zero `any` in lib/" rule.

### Decided
- AdvisorMax is a group client (one login, advisors as offices).
- Arrive Financial is *not* a group — each advisor is its own client.
- New order numbering continues the integer sequence (max+1).
- Admin URLs use a `/admin` prefix; the `(admin)` route group from the
  plan was dropped because it collided with the `(client)` routes (ADR 0007).
