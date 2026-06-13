# Tasks

> Live task list. The multi-agent dispatch board for `feature/admin-views`
> lives in [`tasks/INDEX.md`](tasks/INDEX.md) — this file is for the
> human-facing TODOs and follow-ups across the project.

## Active

- [ ] **Cut `main` branch** — Vercel production target, set branch protection. Currently `feature/admin-views` is de-facto trunk; CHANGELOG/branching/deployment all assume `main` exists. (from agent-c TASK-003 Gap #1)
- [ ] **Run `npm run verify:rls` against production** — script exists at `scripts/verify-rls.ts`. Flips DoD #6 from "script exists" to "actually verified." Blocked on R007 finishing.
- [ ] **Smoke-test 15MB proof upload on Vercel preview** — only DoD line that can't be checked from source. Tests the direct-to-Storage signed-upload flow end-to-end.
- [ ] **Custom SMTP for Supabase auth invites** — built-in mailer is rate-limited (2/min, `rate_limit_email_sent = 2`). Blocks real-volume invite testing.
- [ ] **`/admin/orders/new` admin order-create flow** — spec implies admins can create orders too; the route doesn't exist (only `/orders/new` client). Bigger scope; design needed.

## Waiting On

- [ ] **R007: Extend `scripts/verify-rls.ts`** — 5 coverage gaps (security_invoker regression guard, storage RLS, read-via-view, cross-tenant clients/offices/venues, profile-self-promotion + proof-status enum guards). Unassigned in `tasks/INDEX.md` — waiting for the security agent.
- [ ] **DS001 design-system audit follow-ups** — agent just landed the audit at `tasks/DS001-design-system-audit.md`. Score 76/100, 8 issues. Need to read it and decide which to ship.

## Someday

- [ ] Sentry or similar error reporting
- [ ] Per-client custom branding (logo on login, color accent)
- [ ] Email digest of new orders / proof decisions
- [ ] Admin venue management UI under `/admin/clients/[id]/venues`
- [ ] Edit-in-place for venues / buildings / rooms (currently only create + delete-cascade)
- [ ] Custom invite email template / branded copy (Supabase Studio)
- [ ] "Remove user" / "Disable user" admin action
- [ ] Let `client_user` role invite their own teammates (RLS already permits — just need scoped UI)
- [ ] Hierarchical clients tab — collapse FTA to show advisor children expandable

## Done

- [x] ~~R001: Hoist 6 raw `supabase.from()` calls into `lib/db/*`~~ (2026-05-24)
- [x] ~~R002: Cleanup batch — dead Sidebar, login gradient, account auth~~ (2026-05-24)
- [x] ~~R003: Refactor `<Button>` to accept `href`~~ (2026-05-24)
- [x] ~~R004: Extract shared `<Pill>` primitive~~ (2026-05-24)
- [x] ~~R005: Sync prose docs to `/callback` URL~~ (2026-05-24)
- [x] ~~R008: Date-range + status filters on `/admin/orders`~~ (2026-05-24)
- [x] ~~R010: Per-invoice detail page at `/admin/invoices/[id]`~~ (2026-05-24)
- [x] ~~T012: Fix auth callback URL `/auth/callback` → `/callback`~~ (2026-05-24)
- [x] ~~T009: Admin invite users + per-client team management + DB sync~~ (2026-05-23)
- [x] ~~T008: Dissolve AdvisorMax group; Andy Urso becomes own client~~ (2026-05-23)
- [x] ~~T007: Backfill client business/defaults/pricing/notes from Client Dictionary~~ (2026-05-23)
- [x] ~~T006: Tabbed OrdersList on client detail page~~ (2026-05-23)
- [x] ~~T005: 2-col office grid for group clients only~~ (2026-05-23)
- [x] ~~T004: Region + contact info on each office card~~ (2026-05-23)
- [x] ~~T003: `DIG-NNN` display_ref for digital-only orders~~ (2026-05-23)
- [x] ~~T002: Consolidate digital-sheet duplicate clients~~ (2026-05-23)
- [x] ~~T001: Past tab = strict past event date~~ (2026-05-23)
