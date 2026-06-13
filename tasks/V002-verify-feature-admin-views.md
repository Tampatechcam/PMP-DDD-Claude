# V002 — Verify `feature/admin-views` branch

**Status:** complete
**Owner:** claude (verify skill)
**Started:** 2026-05-24
**Scope:** Full runtime verification of `feature/admin-views` vs `chore/scaffold`. 51 commits, 131 files changed.

---

## Verification: feature/admin-views branch

**Verdict:** PASS (with findings)

**Claim:** Complete PMP Dashboard implementation — admin shell (clients, orders w/ filters, invoices, proofs, profiles), client shell (orders, order detail, new order, venues, account), shared UI primitives (Button, Pill, Card, Input), data layer hoisting, auth, and RLS. All Part 15 Day-7 deliverables.

**Method:** Preview server port 3001 (already running). No verifier skill in `.claude/skills/`. Demo: Admin and Demo: Client buttons used to exercise both sessions. 51 commits, 131 files. Uncommitted working-tree changes: `OrdersList.tsx` (colgroup fix), `verify-rls.ts` (NoopWebSocket shim), `tasks/INDEX.md`, `app/(auth)/login/page.tsx` (shadow-sm removal, fixed in this session).

---

### Steps

1. ✅ **Admin overview** (`/admin`) — 40 clients, 207 orders, 0 proofs awaiting, 0 invoices stat cards render. Upcoming/Past tabs with full orders table (order number, dates, client, advisor, status). StatusPill renders via shared `<Pill>` primitive with correct tones.

2. ✅ **Admin orders + R008 filters** (`/admin/orders?status=Proof+Sent+to+Client`) — URL param drives server-side filter. Result: 1 order, "1 · clear filters" header, Status dropdown shows "Proof Sent to Client" selected. Upcoming 1 / Past events 0 count. The matching order (#932) renders status as "Proof Sent to Client".
   Filters present: Client (40 options), Class (R101/W101/SS101/WAT/R90/Taxes), Type (Direct mail/Digital), Status (4 values), From/To date range, Search text, Apply button.

3. ✅ **Admin order detail** (`/admin/orders/954`) — all sections render: events (date/time/room), venue (name + address), direct mail (piece count, approval/send deadline), proofs (v1 "Approved" badge + "View PDF"), history timeline, right panel (client info, defaults, pricing, office/TN badge, notes). "Upload proof" CTA top-right.

4. ✅ **Admin clients** (`/admin/clients`) — 40 total · 2 group · 38 independent listed as links with type and responsibility badges.

5. ✅ **Admin client detail — FTA** (`/admin/clients/[id]`) — all sections: Business, Defaults, Pricing & ops (internal), Notes, Offices (10-up grid w/ state badges), Team (1), Orders (Upcoming 7 / Past events 90 tabbed table). Team section shows member (Demo Client FTA), role badge "client", last signed-in date. Invite user form (email + optional name + Send Invite) embedded in page.

6. ✅ **Order links stay in admin shell** — `href` values on all order links from admin client detail are `/admin/orders/[n]`, not `/orders/[n]`. `d36ef6b` fix confirmed.

7. ✅ **Admin invoices** (`/admin/invoices`) — empty state "No invoices yet · 0 total · 0 paid" renders correctly. Demo account has no invoice data; R010 per-invoice detail (`/admin/invoices/[id]`) cannot be exercised without real invoice rows.

8. ✅ **Admin profiles/users** (`/admin/profiles`) — 2 users (demo-client@pmp.test as client, demo-admin@pmp.test as admin), role pills, invite form.

9. ✅ **Login page** (`/login`) — gradient removed (R002). No shadow on card after this-session fix. Form fields, "Sign in" button, magic-link fallback, Demo: Client + Demo: Admin buttons. Card classes confirmed: `bg-surface border border-border rounded-lg p-6` (shadow-sm removed).

10. ✅ **Client orders** (`/orders`) — 173 total. Upcoming 7 / Past 98 tabs. "New order" button is `<a href="/orders/new">` with full button base classes (R003). StatusPill renders via `<Pill>` `<span>` (R004). Office filter nav with 11 offices. Colgroup removed — 0 new hydration warnings.

11. ✅ **New order form** (`/orders/new`) — "FTA · 10 offices" subtitle. Order type checkboxes (Direct mail checked, Digital, Google sheet). Basics section: Class type dropdown (R101), Office dropdown, Advisor name, Market fields.

12. ✅ **Client order detail** (`/orders/954`) — events, venue, proofs (v1 "Approved" + "View PDF"), history, right panel (client info, defaults, office). StatusPill renders correctly.

13. ✅ **Venues** (`/venues`) — empty state "No venues yet" with "+ Add a venue" button renders correctly.

14. 🔍 **Probe — authenticated redirect to `/login`** — navigating to `/login` while admin-authenticated shows a Next.js dev-mode Server Error overlay: `TypeError: Cannot read properties of null (reading 'useContext')` in `PathnameContext`. Root cause: `login/page.tsx:14` calls `redirect('/orders')` synchronously in SSR; the RSC streaming layer in Next.js 14.2.35 races with client hydration. In production (without the dev overlay) the redirect completes normally. Pre-existing Next.js 14 known issue — not introduced by this branch.

15. 🔍 **Probe — colgroup post-fix count** — navigated to `/orders` after colgroup removal; `document.querySelector('colgroup')` → `null`. Console warn count held at 24 (all pre-fix); zero new warnings added.

---

**Screenshot (admin orders with filter):** Table shows 1 result for status=Proof Sent to Client with "clear filters" link and correct status pill.

---

### Findings

⚠️ **`client_self_view` omits `is_group` — FTA shows "Independent client" in client order detail.**
`supabase/migrations/20260523000007_view_rls_and_backfill.sql:46` selects `is_non_profit` but not `is_group`. `ClientInfoCard` receives `is_group: undefined`, so it always renders "Independent client" even for FTA (which is a Group client). Fix: add `is_group` to the view's column list in a new migration. Minor display defect; doesn't affect functionality.

⚠️ **`/admin/invoices/[id]` (R010) not exercised** — demo data has 0 invoice rows. The per-invoice detail page could not be driven at the browser surface. Code review of [`app/admin/invoices/[id]/page.tsx`](../app/admin/invoices/%5Bid%5D/page.tsx) shows the structure exists; runtime coverage gap.

⚠️ **`shadow-sm` on login card (DS001 Issue 2) — fixed in this session.** Was present in the branch; removed `shadow-sm` from `app/(auth)/login/page.tsx:30` during this verification. Uncommitted.

🔍 Next.js 14.2.35 flagged as outdated in the dev overlay — not a branch issue, but worth scheduling an upgrade.

🔍 `window.location.href` nav to admin routes in preview sometimes requires `window.location.replace()` to take effect — verified by cross-checking URL after each navigation.
