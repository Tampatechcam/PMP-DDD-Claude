# TASK-002 — App Structure + Data Layer + Auth Audit
**Status:** complete
**Owner:** agent-b
**Started:** 2026-05-24T07:49:25Z
**Completed:** 2026-05-24T07:53:25Z
**Scope:** Parts 6, 11, 13, 18 of the implementation plan.
**Files touched:** none (read-only audit)

## Summary

The TS/React/Next side is in very good shape against the plan. The three
Supabase clients are exactly what Part 6.1 prescribes, `import 'server-only'`
guards `admin.ts`, middleware matches Part 6.2 verbatim, `next.config.js`
matches Part 13, the design tokens in `tailwind.config.ts` are the semantic
palette from Part 9, there is zero `: any` / `as any` in `lib/`, no
hand-rolled `AuthContext`/`useAuth`/`pages/api/*`, and no `styled-components`
or stray CSS. The `app/admin/*` literal vs `(admin)` route group is a
documented intentional deviation (ADR 0007 — the plan's structure literally
won't build because two `(client)/orders/page.tsx` and `(admin)/orders/page.tsx`
collide).

The one real bug: the magic-link / invite callback URL is wrong everywhere
in code. The route file lives under route group `(auth)` so its URL is
`/callback`, but four callers (and three docs) point at `/auth/callback`.
This breaks magic-link sign-in and admin invites.

Smaller issues: six raw `supabase.from('<table>')` data calls inside `app/`
and `components/` (Operating principle #3 violation), one inline duplicate
of `<Button>`'s primary styling repeated in three pages, and one dead-code
stub at `components/layout/Sidebar.tsx`.

## Findings

### A. Route structure (Part 11)

Tree on disk (`app/`):
- `(auth)/login/page.tsx`, `(auth)/callback/route.ts` — match plan.
- `(client)/{layout, page, account, orders, orders/new, orders/[order_number], proofs/[id], venues}/page.tsx` — match plan.
- `admin/` (literal, no parens) instead of `(admin)/`: `layout`, `page`, `clients/`, `clients/[id]/`, `invoices/`, `orders/`, `orders/[order_number]/`, `profiles/`, `proofs/[id]/upload/`.

Deviations:
- **`app/admin/...` is a literal segment, not `(admin)`.** Documented and justified in `docs/decisions/0007-admin-url-prefix.md:1-71`. The plan's tree at `PMP Dashboard — Implementation Plan.markdown:632-640` would collide on `/orders` and `/orders/[order_number]` (Next refuses to build "two parallel pages that resolve to the same path"). The literal `/admin` prefix is the right call — accept the deviation.
- **`app/admin/profiles/page.tsx`** — not listed in the plan's Part 11 tree but exists at `app/admin/profiles/page.tsx:12`. Reasonable extension (admin user mgmt landed Day-7 per recent commit `f39a0df`).
- **No `app/api/`, no `pages/`, no `pages/api/`.** `find` returned nothing for either; clean.
- **Layouts present:** `app/layout.tsx:9`, `app/(client)/layout.tsx:10`, `app/admin/layout.tsx:12`. The `(auth)` group has no layout — fine, login renders its own shell.

### B. Supabase clients (Part 6.1)

- `lib/supabase/server.ts:1-25` — uses `@supabase/ssr` `createServerClient` with the `getAll`/`setAll` cookie shape **verbatim** from the plan. `import 'server-only'` at line 1 (the plan didn't require it for `server.ts` but it's a nice extra guard).
- `lib/supabase/client.ts:1-11` — `createBrowserClient` from `@supabase/ssr`. Exact match.
- `lib/supabase/admin.ts:1-18` — `import 'server-only'` at line 1, uses raw `@supabase/supabase-js` `createClient` with `SUPABASE_SERVICE_ROLE_KEY`, `auth: { persistSession: false }`. Matches plan.
- **No fourth init file.** `Grep` for `createClient|createServerClient|createBrowserClient` across `**/*.{ts,tsx}` found only:
  - The three in `lib/supabase/`.
  - `scripts/verify-rls.ts:24,36,146`, `scripts/import-real.ts:30,47` — scripts running outside the Next runtime (out of scope for the "three clients only" rule; they exist to seed/verify).
  - All consumers import from `@/lib/supabase/{server,client,admin}`.

### C. Data access layer (Operating principle #3, Part 11)

- `lib/db/` exists with `orders.ts`, `proofs.ts`, `venues.ts`, `clients.ts`, `offices.ts`, `invoices.ts`, `profiles.ts`, `auth.ts`. The plan called for six files; we have eight (the two extras — `profiles.ts`, `auth.ts` — are reasonable additions for the admin team mgmt feature and a memoized `getAuthUser`).
- `lib/actions/` exists with `orders.ts`, `proofs.ts`, `venues.ts`, `auth.ts`, `admin-users.ts`, `demo.ts` (the last marked "delete before production" at `lib/actions/demo.ts:9`).

Raw `supabase.from('<table>')` calls inside `app/**/*.tsx` or `components/**/*.tsx` (excluding the auth-only `supabase.auth.getUser()` which is fine, and `storage.from('proofs')` which is a bucket reference): **6 occurrences across 5 files.**
  - `app/admin/page.tsx:30` — `.from('clients').select('id', { count: 'exact', head: true })` — count query inline. Should be `adminCountClients()` in `lib/db/clients.ts`.
  - `app/admin/page.tsx:34` — `.from('orders').select(..., {count, head}).eq('needs_direct_mail', true)`. Inline.
  - `app/admin/page.tsx:38` — `.from('proofs').select(..., {count, head}).eq('status', 'pending')`. Inline.
  - `app/admin/page.tsx:41` — `.from('invoices').select(..., {count, head})`. Inline.
  - `app/admin/proofs/[id]/upload/page.tsx:18` — `.from('orders').select(...).eq('id', params.id).maybeSingle()` — should reuse / be a sibling of `getOrderByRef` in `lib/db/orders.ts`.
  - `app/(client)/orders/[order_number]/page.tsx:31` — `.from('offices').select(...).eq('id', order.office_id).maybeSingle()`. Should be `getOfficeById()` in `lib/db/offices.ts`.
  - `app/admin/orders/[order_number]/page.tsx:32` — same shape as above (duplicate of the client-side version). Same fix.
  - `components/admin/TeamSection.tsx:23` — `.from('profiles').select(...).eq('client_id', client.id).order(...)` — should be `adminListTeamForClient(clientId)` in `lib/db/profiles.ts`.

`account/page.tsx:13-14` does `const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser()` — this is an auth call, not a `.from(table)` query. Not a violation, but it should use the memoized `getAuthUser()` from `lib/db/auth.ts:19` for consistency (free perf win — `getMyProfile()` etc. all share one round-trip per render).

### D. Service role leaks (Part 13, Part 18)

Files importing `@/lib/supabase/admin` or referencing `SUPABASE_SERVICE_ROLE_KEY` outside `lib/supabase/admin.ts` itself: **6** (all server-only):
- `lib/actions/admin-users.ts:17` — `'use server'` action. OK.
- `lib/actions/demo.ts:4` — `'use server'` action. OK (and slated for deletion before prod per the file header).
- `lib/actions/proofs.ts:5` — `'use server'` action. OK.
- `lib/db/profiles.ts:58` — dynamic `await import('@/lib/supabase/admin')` inside `adminListProfiles()`. The dynamic import is unusual but the file is `server-only` (`lib/db/profiles.ts:1`) and the function is only called from server components after the admin layout has gated. OK.
- `components/admin/TeamSection.tsx:2` — top-level static import. The file is a **Server Component** (no `'use client'` directive in `components/admin/TeamSection.tsx`) and is rendered only from the admin-gated `app/admin/clients/[id]/page.tsx:161`. OK.
- `scripts/verify-rls.ts`, `scripts/import-*.ts` — Node scripts outside the bundle, expected to use the service key.

No client component imports `admin.ts`. The `import 'server-only'` guard at `lib/supabase/admin.ts:1` would fail the build if one did. **Clean.**

### E. Middleware (Part 6.2)

- `middleware.ts:1-31` exists at project root.
- Uses `@supabase/ssr`'s `createServerClient` with the `getAll`/`setAll` cookie shape from the plan (`middleware.ts:11-18`).
- Calls `await supabase.auth.getUser()` at `middleware.ts:23`. The comment at `middleware.ts:21-22` explicitly notes "Do not put auth gating here — RLS handles security; route groups handle UI" — matches the operating principles.
- Matcher at `middleware.ts:29` is **byte-for-byte the plan's pattern**: `'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)'`.

### F. Next config (Part 13)

- `next.config.js:4-5` — `experimental.serverActions.bodySizeLimit: '1mb'`. Matches plan.
- `next.config.js:7-8` — `images.remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }]`. Matches.
- `package.json:5-7` — `"engines": { "node": ">=20" }`. Matches Part 13 item 4.
- `package.json:21-25` — `@supabase/ssr ^0.5.0`, `@supabase/supabase-js ^2.45.0`, `next ^14.2.0`, `react ^18.3.0`. All current.

### G. Dead code candidates

- **`components/layout/Sidebar.tsx:1-5`** — stub: exports `Sidebar()` that returns `null`. Grep across `**/*.{ts,tsx}` finds **zero importers** (the admin shell uses `AdminSidebar`, the client shell uses `ClientHeader`). Delete.
- **`lib/actions/demo.ts`** — header comment at lines 6-9 explicitly says "DELETE this file and the login-page buttons before going to production." Still wired up at `app/(auth)/login/page.tsx:6,52,57`. Track for removal pre-prod, not now.
- **No `AuthContext.tsx`, no `useAuth.ts`.** `find` returned nothing. Plan's Part 18 item 1: done.
- **No client-side role checks used for security.** All `profile.role === 'admin'` references are in Server Components / Server Actions or local form UI state:
  - `app/page.tsx:14` — server.
  - `app/admin/layout.tsx:15` — server (the gate).
  - `app/admin/profiles/page.tsx:19,95` — server.
  - `components/admin/TeamSection.tsx:76` — server (visual pill).
  - `lib/actions/admin-users.ts:84,147` — server action (post-create redirect destination).
  - `components/admin/InviteUserForm.tsx:103` — `'use client'`, but the check drives radio-button display only. Not security.
- **No duplicate Card/Button/Modal.** Single canonical `components/ui/{Card.tsx, Button.tsx, Input.tsx, Icon.tsx}`. However, the primary-button styling string `bg-accent text-white hover:opacity-90` is **re-implemented inline** instead of using `<Button>` at:
  - `app/(client)/orders/page.tsx:42` — "New order" link.
  - `app/admin/orders/page.tsx:112` — filter "Apply" button.
  - `app/admin/orders/[order_number]/page.tsx:52` — "Upload proof" link.
  These are `<Link>` and a `<button type="submit">` inside a `<form method="get">` where `<Button>` would work fine (the `<Link>`s need a wrapper or a `Button asChild`-style API which we don't have today). Low-priority cleanup.
- **No styled-components / no @emotion.** `Grep` for both returned zero. Only CSS file is `app/globals.css:1-12` (12 lines, just `@tailwind` + base font). Plan's Part 18 item 5: done.
- **No `pages/api/*`, no `pages/`.** Plan's Part 18 item 3: done.
- **No manual JWT middleware.** `middleware.ts:1-31` is purely `@supabase/ssr`. Plan's Part 18 item 8: done.

### H. Design tokens (Part 9)

- `tailwind.config.ts:11-21` — `bg`, `surface`, `border`, `ink`, `muted`, `accent`, `success`, `warning`, `danger`. **Exact** match to the plan's snippet at lines 580-589.
- `tailwind.config.ts:22-23` — `fontFamily.sans: ['Inter', ...]`, `borderRadius: { DEFAULT: '6px', lg: '10px' }`. Matches plan.

Ad-hoc tone classes (`gray|stone|slate|zinc|neutral|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose`-NN) usage:
- `components/orders/StatusPill.tsx:9-12,29-32` — pill tones: stone/emerald/amber/rose at 50/100/200/400/500/700/800/900. Intentional — the StatusPill needs four discriminable colors and the semantic palette only has `success`/`warning`/`danger`/no-neutral-tint. Reasonable.
- `app/admin/invoices/page.tsx:100-103` — duplicates the same emerald/amber/stone tones as StatusPill. Should reuse `StatusPill` instead of inlining a near-copy.
- `app/(auth)/login/page.tsx:21` — `bg-gradient-to-b from-bg to-stone-100`. This is the **only `bg-gradient` in the codebase** and Part 9 explicitly says "No gradients". Minor visual deviation.

### I. Type safety

- `types/db.ts` exists, generated from Supabase. Last modified 2026-05-23 05:52 (`stat`), one day before this audit. The most recent migration `20260523000013_office_state.sql` is also 2026-05-23, so types should be in sync — confirm by `head` of `types/db.ts:17-30` showing `buildings` and a populated `Database` shape.
- `: any` occurrences in `lib/`: **0.** `Grep` for `:\s*any\b` and `as\s+any\b` across `lib/**/*.{ts,tsx}` returned **no matches**. The `as { clients?: ... }` cast at `lib/db/profiles.ts:71` is a specific cast, not `any`. Plan's Definition-of-Done #8: done.
- `: any` / `as any` occurrences in `scripts/`: 9, all in import/backfill scripts (`scripts/import-v2.ts:50,78`, `scripts/import-real.ts:37,50,438,439,887`, `scripts/backfill-office-fields.ts:43`, `scripts/backfill-client-business.ts:32`, `scripts/consolidate-clients.ts:34`). Out of plan's `lib/`-only constraint, but worth noting if scripts get reused.

## Gaps (prioritized)

1. **Magic-link / invite callback URL mismatch (BROKEN AUTH)** — impact: **high**. Why: the route file is `app/(auth)/callback/route.ts` so the URL is `/callback` (the `(auth)` group is path-free), but the magic-link redirect at `lib/actions/auth.ts:54` and the invite redirects at `lib/actions/admin-users.ts:85,148` all point to `${siteOrigin()}/auth/callback`. Same wrong URL in `docs/AUTH.md:27`, `docs/ARCHITECTURE.md:43`, `docs/decisions/0006-password-plus-magic-link.md:32`, `docs/decisions/0007-admin-url-prefix.md:37`. Either magic-link sign-in is currently failing (404 on the redirect) or the docs intent was right and the file should be moved. **Fix is to move the route file to `app/auth/callback/route.ts`** (a literal `auth` segment, mirroring the `admin` decision in ADR 0007) — that matches every doc, every existing redirect, and Supabase's "Redirect URLs" config.

2. **Raw `supabase.from('<table>')` calls in pages/components (6 sites)** — impact: medium. Why: Operating principle #3 says "One data-access layer: `lib/db/*.ts` server-side functions. No raw `supabase.from()` scattered in components." Cited offenders: `app/admin/page.tsx:30,34,38,41`, `app/admin/proofs/[id]/upload/page.tsx:18`, `app/(client)/orders/[order_number]/page.tsx:31`, `app/admin/orders/[order_number]/page.tsx:32`, `components/admin/TeamSection.tsx:23`. Suggested fix: add `adminCounts()` in `lib/db/orders.ts` (or a new `lib/db/dashboards.ts`), `getOrderById(id)` in `lib/db/orders.ts`, `getOfficeById(id)` in `lib/db/offices.ts`, `adminListTeamForClient(clientId)` in `lib/db/profiles.ts`. Swap call sites.

3. **`components/layout/Sidebar.tsx` is dead** — impact: low. Why: stub returning `null`, zero importers. Suggested fix: delete the file. One-line change. Watch out: the plan's Part 11 lists `components/layout/{Sidebar,OfficeSwitcher}.tsx` — current shell uses `AdminSidebar` + `ClientHeader` instead. If you want to preserve the plan's naming, rename `AdminSidebar.tsx` → `Sidebar.tsx` and update one import; otherwise delete and accept the deviation.

4. **Inline duplicate of `<Button>` primary styling (3 sites)** — impact: low. Why: re-implements `bg-accent text-white hover:opacity-90` inline in `app/(client)/orders/page.tsx:42`, `app/admin/orders/page.tsx:112`, `app/admin/orders/[order_number]/page.tsx:52`. Suggested fix: extend `<Button>` to render `as <Link>` when `href` is passed (or add a `<ButtonLink>` wrapper) and reuse.

5. **`InvoiceStatus` inline tones duplicate `StatusPill`** — impact: low. Why: `app/admin/invoices/page.tsx:98-108` defines its own pill with the same emerald/amber/stone tones already in `components/orders/StatusPill.tsx:8-12`. Suggested fix: refactor to either share a `<Pill tone={...}>` primitive or just use `StatusPill` if its tone map covers invoice statuses.

6. **`/login` gradient violates "No gradients" rule** — impact: low. Why: `app/(auth)/login/page.tsx:21` uses `bg-gradient-to-b from-bg to-stone-100`, while Part 9 says "No gradients, no emoji, no big color blocks." Suggested fix: flat `bg-bg` (or remove the gradient classes entirely) at the `<main>`.

7. **`account/page.tsx` calls `supabase.auth.getUser()` directly instead of the memoized `getAuthUser()`** — impact: very low. Why: `app/(client)/account/page.tsx:13-14` does its own `createClient(); supabase.auth.getUser()`, missing the per-request `cache()` wrapper in `lib/db/auth.ts:19`. The layout has already called `getAuthUser()`, so the second call costs an extra `/auth/v1/user` round-trip. Suggested fix: `import { getAuthUser } from '@/lib/db/auth'` and use it.

## Recommended next actions

1. **TASK-### Fix the auth callback URL.** Move `app/(auth)/callback/route.ts` to `app/auth/callback/route.ts` (literal segment) so it resolves to `/auth/callback` and matches every redirect and doc. Verify magic-link sign-in and admin-invite acceptance end-to-end on a Vercel preview. Possibly also a Supabase Auth dashboard URL config update.
2. **TASK-### Hoist the 6 raw `.from('<table>')` calls into `lib/db/`.** Mechanical: add `adminCounts()`, `getOrderById()`, `getOfficeById()`, `adminListTeamForClient()`. Eight or so files touched, no behavior change. Closes Operating-principle-#3 debt before more pages add similar shortcuts.
3. **TASK-### Tiny cleanup batch.** Delete `components/layout/Sidebar.tsx`. Drop the gradient on `/login`. Switch `account/page.tsx` to `getAuthUser()`. (Optional: extract a `<Pill>` primitive and replace the inline pill in `app/admin/invoices/page.tsx` + inline primary-button styles in three pages.) Total ~15-line cleanup; eliminates every minor lint nit from this audit.

## Confidence

High. Every claim is grepped or read directly from disk against the plan
text. The one item I couldn't confirm operationally is whether the
`/callback` vs `/auth/callback` mismatch is currently breaking sign-in in
production (depends on what's configured in the Supabase dashboard); the
code-level mismatch itself is unambiguous.
