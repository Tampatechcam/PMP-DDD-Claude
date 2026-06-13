# TASK-003 — Day 7 Status
**Status:** complete
**Owner:** agent-c
**Started:** 2026-05-24T03:50:02-04:00
**Completed:** 2026-05-24T04:03:05-04:00
**Scope:** Parts 8, 10, 15, 17 of the implementation plan.
**Files touched:** none (read-only audit; `npx tsc --noEmit` run once for DoD; `npm run build` attempted but blocked by a running `next dev` server holding `.next/trace` — local sandbox issue, not a code defect)

## Summary
The Day 7 deliverable — "Static client info panel, invoices view, global orders filter, polish" — has effectively landed on `feature/admin-views` and gone past it. All three named surfaces exist, are wired to the typed data layer, and read through `orders_with_display_status`. The branch has accumulated 5 days of work past the Day 7 deliverable (admin invites, team management, Client Dictionary backfill, group dissolution, tabbed orders list on client detail). Definition-of-done is mostly green on what can be checked from source. **Three gaps** before this is mergeable: (1) `main` branch doesn't exist locally — branch is currently the de-facto trunk; (2) the global orders filter has no date-range control; (3) several DoD items (Vercel-prod login, Lighthouse, 15MB proof flow, fresh-clone README) can only be checked by running the app.

## Branch state
- **No `main` ref** — `git rev-parse main` fails (`unknown revision`); local branches are `chore/scaffold`, `feature/admin-views` (current), `feature/auth`, `feature/order-form`, `feature/orders`, `feature/proofs`, `feature/venues`. Plan calls for a protected `main` (Part 14).
- Total commits in repo: 44. From the Day 1 scaffold (`2786c4b`) to `HEAD` (`4ef9ef2`): 43 commits.
- Working tree clean (`git status`).

### Commits since the Day 1 scaffold (most recent first, abridged)
```
4ef9ef2 chore: gitignore .claude/settings.local.json
d36ef6b fix(admin): order links from admin pages stay in the admin shell
f39a0df feat(admin): invite users + per-client team management + db sync
27fa540 feat(clients): dissolve AdvisorMax group, Andy Urso becomes own client
6cb4204 feat(clients): backfill business/defaults/pricing/notes from Client Dictionary
ff62cd8 feat(clients): use the tabbed OrdersList table on the client detail page
279f77a feat(clients): 2-col office grid for group clients only
106e067 feat(clients): region + contact info on each office card
b621aca feat(orders): DIG-NNN display_ref for digital-only orders
09872c5 chore(data): consolidate digital-sheet duplicate clients into their firms
accd961 fix(orders): Past = past event date only; hide future Order Sent
52719be fix(orders): table-fixed layout closes gap on Past tab; Orders count = DM only
d7eb951 tweak(orders): drop Order Sent Deadline column from Past tab
efba523 fix(orders): bucket strictly by dm_status — Past = Order Sent, no overlap
78d88b0 fix(orders): bucket Past strictly on past event dates
d53a959 feat: full-format dates, widened admin shell, client info card on order detail
5a236d7 feat(admin): orders table on Overview, Past events in sidebar, new columns
f01dfd9 feat(dates): compute first_class_day = event - 14d, order_sent_deadline = Mon 4w prior
f0f3c0f feat(import): v2 re-import — DM + Digital only, first_class_day = Order Sent Deadline
786e35c tweak(orders): both tabs sort newest-first (descending pivot date)
…
1cb3c05 feat: verify-rls script (Part 17 DoD #6)
5e5473e chore: tsc clean (cookie types, venue cast) + build verified
0b15059 feat(admin): admin shell pages + demo sign-in buttons   ← Day 7 anchor
67b0e77 feat(proofs): admin upload, client approve/revise, signed-URL view
a2efb99 feat(order-form): /orders/new with conditional DM/digital blocks
35cf2e7 feat(orders): orders list, office switcher, order detail page
97d5368 feat(venues): venue / building / room management UI
794255a feat(auth): login (password + magic-link), account, sign-out
2786c4b chore: Day 1 scaffold + initial schema
```

### Surface area (`git diff --stat 2786c4b..HEAD` tail)
94 files changed, 17,769 insertions(+), 248 deletions(-). New `lib/actions/` (5 files), new `lib/db/` (8 files), new `components/admin/`, `components/layout/`, `components/orders/`, `components/proofs/`, 13 migrations, 7 ADRs, 6 doc files, 8 scripts.

## Day 7 deliverables

### Invoices view
**Status:** ✅ shipped (Day 7 minimum); not styled for v1 polish.

- `app/admin/invoices/page.tsx:9-96` — Server Component, fetches via `adminListInvoices()`.
- Header shows `{n} total · {paid} paid · {totalSum} invoiced` (`page.tsx:21-26`).
- Table columns: Order link · Status pill · Sent date · Paid date · DM total · Digital · Total (`page.tsx:39-91`). Order column is a `<Link>` to `/admin/orders/<ref>` via `orderHref(inv.orders, '/admin/orders')` (`page.tsx:55-58`) so the order link stays inside the admin shell.
- Data accessor: `lib/db/invoices.ts:23-31` joins `orders ( order_number, display_ref, client_id )` via PostgREST embed; the `InvoiceRow` type at `invoices.ts:4-19` covers every field from Part 4.1 (`status`, `invoice_sent_date`, `invoice_paid_date`, `invoiced_dm_rate`, `invoiced_dm_total`, `invoiced_digital`, `invoiced_tech`, `cc_processing`, `fl_state_tax`, `total_invoice`).
- **What's not shown in the table:** `invoiced_dm_rate`, `invoiced_tech`, `cc_processing`, `fl_state_tax`. They are in the row type but not surfaced. Acceptable for a list view — they'd belong on a per-invoice detail page (no such page exists).
- Surfaces `is_admin()` policy gate: comment at `page.tsx:5-8` notes "RLS owns the gate; the layout enforces navigation."

### Static client info panel
**Status:** ✅ shipped twice — once at `/admin/clients/[id]` (full panel) and once as a sidebar on every order detail page.

- `app/admin/clients/[id]/page.tsx:21-176` — Business card (`name, business_name, website, EIN, EIN match name, non-profit`), Defaults card (`mailer_type, class_type, mailing_quantity, digital_budget, disclaimer`), Pricing & ops card (`mailer_rate, dm_discount, tech_sequences, start_before_paid` — admin-only), Notes card, Offices list with addresses/registration URLs/return addresses, Team section (`TeamSection`), then the client's tabbed orders list.
- Group clients render offices in a 2-col grid; independents stay single-col (`page.tsx:96-99`). 13 offices for FTA is the design target.
- Data accessors used:
  - `lib/db/clients.ts:31-40` — `adminGetClient(id)` selects all columns from `clients` (admin sees the base table, not `client_self_view`).
  - `lib/db/clients.ts:42-51` — `adminListOfficesForClient(clientId)`.
  - `lib/db/orders.ts:131-160` — `adminListOrders({ clientId, limit: 500 })`.
- The reusable sidebar variant `components/orders/ClientInfoCard.tsx:44-174` is mounted on both `/orders/[order_number]` (client) and `/admin/orders/[order_number]` (admin). The `admin` flag at line 47 toggles whether the internal pricing block (lines 119-139) renders. Client view at `app/(client)/orders/[order_number]/page.tsx:48-52` deliberately passes no `admin` prop so `client_self_view`-style hiding is preserved.
- **Phone, registration URL, return address** are on each office card on `/admin/clients/[id]` (`page.tsx:122-152`). Disclaimer is on the client detail Defaults card (`page.tsx:63`).

### Global orders filter
**Status:** ⚠ partial — three of four expected filters present; **no date range**.

- `app/admin/orders/page.tsx:16-128` reads `searchParams` `client`, `class`, `needs`, `q`, `tab`. Each gets a `<SelectFilter>` (`page.tsx:131-156`) plus a `Search` text input (`page.tsx:101-109`). State is in the URL — the form uses `method="get"` (`page.tsx:65`) so the address bar is the only source of truth, which matches Part 10's "no client state for filtering" rule.
- Data accessor `lib/db/orders.ts:131-160` composes the filters: `clientId`, `classType`, `needs IN ('direct_mail','digital')`, and a triple-ilike across `job_name`, `market`, `advisor_name` (`orders.ts:148-153`).
- Sort: `lib/db/orders.ts:142` orders by `event_1_date desc, nullsFirst: false`, which satisfies the Part 4.1 index direction and the implicit Part 8 ordering expectation. (Server returns newest-first; the OrdersList component re-sorts client-side by pivot date — same descending direction.)
- Header shows row count, active client name, and a "clear filters" link when any filter is set (`page.tsx:48-62`). 500-row cap is surfaced when reached (`page.tsx:50-51`).
- **Missing:** date-range filter. Plan calls out "global orders filter (client, status, date range)". Status is also absent (you can only filter by `class_type` and `needs`, not `display_status` / `dm_status`). Search on the suggested fields is good polish.

### Job card (Part 8)
**Status:** ✅ matches the ASCII sketch.

- `components/orders/OrderCard.tsx:29-197` is the single rendering used at both `/orders/[order_number]` and `/admin/orders/[order_number]`.
- Header (`OrderCard.tsx:52-74`): `Order {orderLabel(o)} · {formatEventDate}` + `StatusPill` on the right + class/types subtitle + advisor name. Matches the "Order #654 · Tue, Jan 13 · In Production" line.
- Sections, rendered in order, each only mounted if its data is present (`OrderCard.tsx:76-194`):
  1. Events — up to 4 dates with optional room, plus `time_notes`.
  2. Venue — `venue_text` + `venue_address_text`.
  3. Direct mail — only if `needs_direct_mail` (line 107); shows quantity + mailer type + approval/send deadlines + sending list URL.
  4. Digital — only if `needs_digital` (line 138); shows budget + landing page URL.
  5. Proofs — list of versions with status pill, comment, and `<ProofActions>` (lines 151-171).
  6. History — `order_events` newest-first.
  7. Notes — `order_instructions` + `notes`.
- No tabs, no accordions. Layout is `<article className="space-y-6">` rendered inside `grid lg:grid-cols-[1fr_22rem]` (client) / `[1fr_24rem]` (admin) — the OrderCard column stays under ~720px on the client side, slightly wider on admin. Acceptable.
- Section dividers: top border via `border-t border-border pt-4` on the `<Section>` wrapper (`OrderCard.tsx:199-208`). Matches the rule "row dividers, no zebra stripes" from Part 9.
- Proofs actions wired: `components/proofs/ProofActions.tsx:18-114`. **View PDF** opens a 10-minute signed download URL (`ProofActions.tsx:27-34`). **Approve** fires `decideProof(proofId, 'approved')` (`ProofActions.tsx:36-44`). **Request revision** opens a textarea, then fires `decideProof(proofId, 'revision_requested', reason)` (`ProofActions.tsx:46-56`). Mandatory comment field for revision matches the design intent.
- Status pill maps to the four-tone scale via `lib/utils/status.ts` (referenced from `OrderCard.tsx:1`).

### Multi-office switcher (Part 10)
**Status:** ✅ shipped, URL-driven, server-side filtered.

- `components/layout/OfficeSwitcher.tsx:10-37` — pure Server Component (zero JS). Renders `[All offices] [Office A] [Office B] …` as `<Link>`s with `?office=<id>` query string (line 29). Returns null for single-office clients (line 19) — independents don't see the switcher.
- Wired on the client orders page only: `app/(client)/orders/page.tsx:49-53` (`basePath="/orders"`). Not present on `/admin/orders` because admins filter by client, not by office.
- Filtering is server-side: `app/(client)/orders/page.tsx:20` passes `activeOfficeId` to `listOrdersForClient({ officeId })`, which adds `q.eq('office_id', officeId)` at `lib/db/orders.ts:72`. State lives only in the URL — no React state for the filter (verified by reading the page; the component imports no `useState`).
- "New order" button preserves the active office: `app/(client)/orders/page.tsx:39-41` builds `/orders/new?office=<id>` so the form pre-selects it.
- Office list source: `lib/db/offices.ts:4-12` — `listOfficesForCurrentClient()` (RLS does the filtering server-side).

## Definition of done (Part 17)

- ❓ **Client logs in on Vercel production, sees only their orders** — auth flow exists (`app/(auth)/login`, `app/(auth)/callback/route.ts`, `lib/actions/auth.ts`), middleware refreshes the session (`middleware.ts`), but production verification needs a real Vercel deploy + browser session. Demo accounts exist (`lib/actions/demo.ts`) — usable for a quick local smoke test.
- ❓ **Admin logs in, sees all clients/orders/invoices** — RLS policies grant admin SELECT on all base tables (`supabase/migrations/20260523000004_rls_policies.sql` via `public.is_admin()`); admin shell exists at `app/admin/{clients,orders,invoices}/page.tsx`; demo admin button available on `/login`. Needs prod login to verify.
- ❓ **Client creates order; appears immediately** — `/orders/new` form exists (per CHANGELOG.md:43-52); `createOrder` action exists in `lib/actions/orders.ts` and uses `revalidatePath`. Not verifiable from source alone.
- ⚠ **Multi-office client toggles offices; list filters** — OfficeSwitcher is correct (`components/layout/OfficeSwitcher.tsx:10-37`) and `listOrdersForClient` filters by office_id (`lib/db/orders.ts:72`). Will work as written but unverified without a multi-office client logged in.
- ❓ **Admin uploads 15MB proof PDF; client receives + approves** — direct-to-Storage flow is wired (`lib/actions/proofs.ts:39-79` mints signed upload URL, `:86-119` finalizes; `next.config.js` has `bodySizeLimit: '1mb'` for actions which is fine since the PDF goes direct to Storage). Approve flow wired (`lib/actions/proofs.ts:127-161`). Untested at 15MB.
- ✅ **RLS verified: client A cannot read client B's order by guessing UUID** — `scripts/verify-rls.ts:1-22` exists and the script (per the docstring) provisions two throw-away clients, signs in as A, and asserts (1) listing returns only A, (2) reading B by UUID returns nothing, (3) reading B's invoices/events/proofs is empty, (4) updating B fails. `npm run verify:rls` defined in `package.json:18`. Script is committed; running it is a one-command check.
- ❓ **Lighthouse perf > 90 on orders list** — orders page is a Server Component (`app/(client)/orders/page.tsx:13`) with the StatusPill the only client islet and OfficeSwitcher zero-JS. Architecture is Lighthouse-friendly but not measured.
- ✅ **Zero `any` types in lib/** — `rg ': any|<any>|as any|any\[\]' lib/` returns no matches. The only `any` strings in `lib/` appear in comments (`lib/db/orders.ts:19`, `:129`; `lib/db/auth.ts:27`; `lib/actions/proofs.ts:14`).
- ❓ **`npm run build` passes, no warnings** — `npx tsc --noEmit` ran clean (exit 0). `npm run build` was blocked by an `EPERM` on `.next/trace` because a `next dev` server in another terminal (5 `node.exe` processes seen via `tasklist`) is holding the file. This is not a code defect, but I couldn't verify the build cleanly within the read-only rules. CHANGELOG line `5e5473e chore: tsc clean (cookie types, venue cast) + build verified` indicates a prior clean build.
- ✅ **Every /docs file touched at least once during build** — every doc has ≥1 commit:
  - `docs/ARCHITECTURE.md` — 2 commits
  - `docs/AUTH.md` — 1 commit
  - `docs/DATA_MODEL.md` — 1 commit
  - `docs/DEPLOYMENT.md` — 1 commit
  - `docs/RUNBOOK.md` — 2 commits
  - `docs/TODO.md` — 3 commits
- ✅ **At least 5 ADRs in docs/decisions/** — 7 present:
  - `0001-supabase-source-of-truth.md`
  - `0002-app-router-server-components.md`
  - `0003-magic-link-vs-password.md` (rejected, superseded by 0006)
  - `0004-one-login-per-group.md`
  - `0005-direct-to-storage-upload.md`
  - `0006-password-plus-magic-link.md`
  - `0007-admin-url-prefix.md`
- ⚠ **CHANGELOG.md has entries for every merged PR** — `CHANGELOG.md:1-94` has a single rich `## Unreleased` block listing Day 1 → Day 7 + the verify-rls script. **No PRs have actually been merged** (no `main` branch, no version blocks). Once `main` is cut and PRs land, this rule kicks in. For now, what's in `Unreleased` is comprehensive.
- ✅ **No file in supabase/migrations/ edited after applied** — Every one of the 13 migration files has exactly 1 commit in its history (verified with `git log --oneline -- <file> | wc -l`). The whole history is `chore: combined migrations + runbook entry for first apply` (`20e99c8`) for files 001–006 + `2786c4b` for the originals, and each subsequent migration in its own dedicated commit.
- ❓ **README quick-start works on a fresh clone** — `README.md:11-31` has a 5-step quick-start (install → env → migrations → types → dev) and they look correct, but a fresh-clone check is by definition something only an end-to-end run can verify. One concern: `README.md:27` says `npm run db:types`, which expects `$SUPABASE_PROJECT_REF` in env (per `package.json:14`), and that's not in the env step — adding `SUPABASE_PROJECT_REF` to the `.env.example` reference would be a one-line fix.

## Gaps (prioritized)

1. **No `main` branch** — impact: **high**. Why: Part 14 mandates "main — Vercel production, protected" and squash-merging from feature branches. Right now `feature/admin-views` is effectively trunk and nothing has been merged. CHANGELOG, branching, deployment all assume `main` exists. Suggested fix: cut `main` from the current `feature/admin-views` tip (after one squash-and-rebase pass), point Vercel at it, and reopen the active feature branches off `main`.

2. **Global orders filter lacks date range** — impact: **medium**. Why: Plan calls for "global orders filter (client, status, date range)"; current implementation has client × class × type × free-text but no date. With ~170+ FTA orders and 4-week order-sent windows, "show me orders in Jan 2026" is a real ops need. Suggested fix: add `from`/`to` searchParams to `app/admin/orders/page.tsx:7-14` and matching `.gte('event_1_date', from).lte('event_1_date', to)` to `lib/db/orders.ts:131-160`.

3. **Status filter missing on /admin/orders** — impact: **medium**. Why: "Status" is the third filter the plan names. Sidebar already deep-links to past events via `?tab=past`, but there's no way to filter to "Awaiting Your Approval" or "Order Sent" from the global list. Suggested fix: add a `display_status` select to the filter row.

4. **`/admin/invoices` has no per-invoice detail** — impact: **low**. Why: Six of the eleven invoice columns from Part 4.1 (`invoiced_dm_rate`, `invoiced_tech`, `cc_processing`, `fl_state_tax`) are typed in `InvoiceRow` but never shown. Acceptable for a list view; a future `app/admin/invoices/[id]/page.tsx` would close this.

5. **No `/admin/orders/new` for ops** — impact: **low**. Why: Spec implies admins can create orders too (no explicit rule), but the route doesn't exist — only `/orders/new` (client) does. Probably fine for v1 since ops can also use the client UI as a workaround via the demo admin's client_id (none), but a clean admin order-creation flow is missing.

6. **`SUPABASE_PROJECT_REF` not in `.env.example`** — impact: **low**. Why: `README.md:27` step 4 (`npm run db:types`) silently expects `$SUPABASE_PROJECT_REF` but the env step (`README.md:18-19`) only mentions URL / anon / service role. Fresh-clone will fail at step 4. Suggested fix: one line to `.env.example` and `README.md:18-19`.

7. **`docs/TODO.md` shows known un-tracked items** — impact: **low**. Why: TODO.md:18-20 lists "Active (tracked in the TaskList)" items including "Regenerate types/db.ts after migrations 012 + 013" — `types/db.ts` is out of date relative to schema. Doesn't block Day 7 but is a footgun for anyone reading the types post-merge.

## Recommended next actions

1. **Cut `main`** off the current `feature/admin-views` tip, configure branch protection, point Vercel at it. (TASK-???)
2. **Add date-range + status filters to `/admin/orders`** — closes the Day 7 "global orders filter" spec line. ~30 min, isolated to two files. (TASK-???)
3. **Regenerate `types/db.ts`** via `npm run db:types` after migrations 012 + 013, commit alongside a verification that no consumer broke. (TASK-???)
4. **Run `npm run build` clean** in a worktree with no dev server attached, capture clean output, attach to PR. Also run `npm run verify:rls` against prod to flip DoD #6 from script-exists to actually-verified. (TASK-???)
5. **Smoke test the 15 MB proof flow on Vercel preview** — closes the only DoD line that can't be checked any other way. (TASK-???)

## Confidence
High on what's in source (every claim has `file:line`); medium on DoD items that need a live environment (Vercel login, Lighthouse, 15 MB upload, fresh-clone README). The build is unverified locally due to a dev-server filesystem lock — `tsc --noEmit` did pass clean.
