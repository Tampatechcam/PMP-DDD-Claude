# Task Index — PMP Dashboard

Tracks every multi-agent task on the PMP Client Dashboard implementation. Each task has its own md file in this directory. The orchestrator (main agent) updates this index when tasks are dispatched and when they complete.

**Project goal:** ship the dashboard per [PMP Dashboard — Implementation Plan](../PMP%20Dashboard%20—%20Implementation%20Plan.markdown).
**Active branch:** `feature/admin-views` (Day 7 in Part 15).
**Working mode:** parallel agents on non-overlapping scope; builder + reviewer pairs for code changes.

## Conventions

- Every task is `tasks/NNN-slug.md` with frontmatter-like header (Status, Owner, Started, Scope, File touched).
- Every claim cites `file:line` evidence.
- Audits are read-only. Builds run in isolated git worktrees; a reviewer agent reads the diff before merge.
- "Status" values: `dispatched` → `in_progress` → `complete` | `blocked` | `superseded`.

---

## Round 1 — Audit (parallel, read-only)

| ID | Title | Status | Owner | File |
|----|-------|--------|-------|------|
| TASK-001 | Schema + RLS audit (Parts 4–5) | complete | agent-a (general-purpose) | [001-schema-rls-audit.md](001-schema-rls-audit.md) |
| TASK-002 | App structure + data layer audit (Parts 6, 11, 18) | complete | agent-b (general-purpose) | [002-app-structure-audit.md](002-app-structure-audit.md) |
| TASK-003 | Day 7 status — `feature/admin-views` (Part 15) | complete | agent-c (general-purpose) | [003-day-7-status.md](003-day-7-status.md) |

### Round 1 cross-check notes (orchestrator)

- **Agent-a's Gap #1 ("No automated RLS verification") is incorrect.** `scripts/verify-rls.ts` exists on disk (confirmed via Glob; also cited by agent-b at `:24,36,146` and by agent-c with `npm run verify:rls` in `package.json:18`). Treat agent-a's Gap #1 as superseded — the remaining schema/RLS gaps stand.
- Agent-a's Gap #2 (display-status view drifted) and Gap #4 (no `security_invoker` regression guard) are real and unaddressed in Round 2 — flagging for a future round.

## Round 2 — Build + review

Dispatched from the Round-1 audits — see
[001-schema-rls-audit.md](001-schema-rls-audit.md) and
[002-app-structure-audit.md](002-app-structure-audit.md) for the
findings each task addresses.

| ID | Title | Status | Owner | File |
|----|-------|--------|-------|------|
| TASK-R001 | Hoist 6 raw `supabase.from('…')` calls into `lib/db/*` (Operating principle #3) | complete | claude | [R001-hoist-raw-from-calls.md](R001-hoist-raw-from-calls.md) |
| TASK-R002 | Tiny cleanup batch (delete dead Sidebar, drop login gradient, use memoized `getAuthUser` in `account/page.tsx`) | complete | claude | [R002-cleanup-batch.md](R002-cleanup-batch.md) |
| TASK-R003 | Refactor `<Button>` to accept an `href` (or add `<ButtonLink>`), replace 3 inline-styled link buttons | open | — | _unassigned_ |
| TASK-R004 | Extract shared `<Pill>` primitive; rewrite `InvoiceStatus` on top of it | open | — | _unassigned_ |
| TASK-R005 | Sync docs to actually-shipped `/callback` URL (4 doc files still say `/auth/callback`) | complete | claude | [R005-doc-callback-url-sync.md](R005-doc-callback-url-sync.md) |
| TASK-R006 | Security/RLS verify — run existing `scripts/verify-rls.ts`, capture results, scope coverage gaps | complete | claude (orchestrator) | [R006-security-rls-verify.md](R006-security-rls-verify.md) |
| TASK-R007 | Extend `scripts/verify-rls.ts` for 5 coverage gaps: `security_invoker` regression guard, storage RLS, read-via-view, cross-tenant clients/offices/venues, profile-self-promotion + proof-status enum guards | open | — | _unassigned_ |

---

## Initial environment snapshot (orchestrator)

- 13 migration files in `supabase/migrations/` (plan baseline = 6; 7 follow-ups). Migrations 008–012 iterate on display status, 013 adds `office_state`.
- Admin routes at `app/admin/...` (literal segment, **not** the `(admin)` route group the plan calls for). Client routes use `(client)` group correctly.
- Admin routes present: `clients`, `clients/[id]`, `orders`, `orders/[order_number]`, `invoices`, `proofs/[id]/upload`, `profiles`, dashboard.
- Client routes present: dashboard, `orders`, `orders/new`, `orders/[order_number]`, `proofs/[id]`, `venues`, `account`.
- Recent commits show admin invites + per-client team management, AdvisorMax dissolution, Client Dictionary backfill, tabbed `OrdersList` on client detail.
