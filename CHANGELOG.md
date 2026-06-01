# Changelog

All notable changes to this project. Update the `## Unreleased` block in
every PR that lands a user-visible or operationally relevant change.

## Unreleased

### Changed
- Migrated browser Sentry init from the deprecated `sentry.client.config.ts`
  to `instrumentation-client.ts` (the path Sentry/Next require going
  forward, incl. Turbopack), and added the required
  `onRouterTransitionStart` export so client-side navigations stay
  instrumented.
- Sentry browser config (`instrumentation-client.ts`): DSN-gated init (skips
  the SDK entirely when no DSN is set), env-aware trace + replay sampling,
  Replay integration only loaded when sampling is enabled (so non-prod
  builds don't ship the replay bundle), privacy-safe replay defaults
  (`maskAllText` + `blockAllMedia` — opt-out per-element with
  `data-sentry-unmask`), explicit `sendDefaultPii: false`, and release
  tagged from `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` so source maps line up
  with the deploy.

### Added
- shadcn `alert-dialog` (Radix) with PMP tokens; venue delete uses accessible confirm instead of `window.confirm`.
- Admin order actions gated with `requireAdmin()`; client layout uses a single
  `getMyProfile()` auth read; Command Palette lazy-loads on first open;
  admin route loading skeletons; `/proofs/[id]` redirects to order proof
  anchors; office contacts on `ClientInfoCard`; demo login behind
  `DEMO_AUTH_ENABLED` (default off); Cursor hooks block `--no-verify`.
- **UX/UI uplift across the portal.** Single coordinated change with
  several user-visible pieces:
  - **Dark mode.** Color tokens (`bg`, `surface`, `border`, `ink`,
    `muted`, `accent`, `success`, `warning`, `danger`) are now backed
    by CSS variables declared in `app/globals.css`. Tailwind reads them
    through `rgb(var(--token) / <alpha-value>)`, so every existing
    class string keeps working and `bg-accent/5` still composes
    correctly. A `.dark` companion block flips the palette; a 9-line
    inline script in the root layout reads `localStorage('pmp-theme')`
    before paint to avoid a flash-of-light. The new `<ThemeToggle>` in
    the sidebar cycles light → dark → system, persisting the explicit
    choice.
  - **Global Command Palette (⌘K).** `components/layout/CommandPalette`
    opens via `⌘K` / `Ctrl-K` or the sidebar search button. Always
    includes the current shell's nav rows; debounces a server-action
    query (`lib/actions/search.ts`) that returns matching clients +
    orders. Scope is `'admin'` (cross-client) or `'client'`
    (RLS-scoped, honors impersonation) so the same component is safe
    in either shell. Up/Down + Enter to choose, Esc closes.
  - **Mobile-responsive shell.** `components/layout/Shell.tsx` replaces
    the two stand-alone sidebars; the desktop aside renders at
    `lg` and up, a sticky top bar (hamburger + brand + search + theme)
    shows on smaller screens, and the hamburger opens a left-drawer
    overlay carrying the same nav. Both client and admin layouts
    switched from always-`flex` to `lg:flex` so the top bar stacks
    above main below the breakpoint.
  - **Admin Overview "Needs attention" rail.**
    `components/admin/AdminAttention` surfaces two queues in a single
    two-column card row: DM-send deadlines inside the next 7 days
    that haven't shipped, and orders with a proof currently sitting
    with the client. Reuses the same order slice the Upcoming table
    already fetches, so it's free at runtime. Renders nothing on a
    clean day.
  - **Filter chips on /admin/orders.** `components/admin/FilterChips`
    renders each active filter as a removable pill (one-click drop)
    plus a "Clear all" affordance. Replaces the previous one-line
    "clear filters" link.
  - **Inline PDF proof viewer + toast feedback on decisions.**
    `<ProofActions>` now embeds the signed proof URL in an iframe
    (with an "Open in new tab" escape hatch) instead of forcing a
    pop-up tab. Approve / Request revision wire through the new
    `<ToastProvider>` so the confirmation persists across the
    surrounding revalidation.
  - **Shared design primitives.** New: `<Toast>` (+ provider mounted
    in the root layout), `<EmptyState>`, `<Skeleton>` (with shimmer +
    `prefers-reduced-motion` fallback), `<Avatar>` (+ exported
    `initials()`), `<Kbd>`, `<Badge>`. Existing pages
    (`/admin/clients`, `/admin/invoices`, `OrdersList`) refactored
    to consume them, removing four bespoke "dashed-border empty
    card" implementations and an inlined initials-avatar.
  - **Animation tokens.** Added `fade-in`, `slide-up`, and `shimmer`
    keyframes + utilities in `tailwind.config` for the palette,
    drawer, toasts, and skeletons.
  - **Icon set expanded.** Added `search`, `x`, `check`, `menu`,
    `sun`, `moon`, `sparkles`, `bell`, `alert` outline paths to
    `components/ui/Icon` so the new components can stay inside the
    single-source-of-truth SVG set.

### Changed
- **Importer writes derived office + client business fields inline now.**
  `scripts/import-v2.ts` previously inserted bare client/office rows then
  shelled out to `backfill-office-fields.ts` and
  `backfill-client-business.ts` to compute four office contact fields
  (state, registration phone, direct-mail landing URL, mailer return
  address) and ~17 client business fields (business name, EIN,
  disclaimer, defaults, pricing, ops flags) by re-querying the rows it
  had just inserted. Both aggregations are folded into the importer:
  office contact fields are modal-picked per office key during the same
  pass that builds the office advisor list, and client business fields
  are read from `scripts/.import-work/client-dict.md` (when present) at
  the start of the run, aggregated per canonical client with
  `unanimous()` for identity fields and `modal()` for everything else,
  then merged into the `clients` insert payload. Dictionary file is
  optional — when absent the importer logs a note and continues. The two
  `backfill-*.ts` scripts remain as idempotent fallbacks for ad-hoc
  correction (fix one office without a full re-import). One
  `npx tsx import-v2.ts` invocation now produces a fully populated DB.

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
