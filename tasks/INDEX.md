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
| TASK-001 | Schema + RLS audit (Parts 4–5) | dispatched | agent-a (general-purpose) | [001-schema-rls-audit.md](001-schema-rls-audit.md) |
| TASK-002 | App structure + data layer audit (Parts 6, 11, 18) | dispatched | agent-b (general-purpose) | [002-app-structure-audit.md](002-app-structure-audit.md) |
| TASK-003 | Day 7 status — `feature/admin-views` (Part 15) | dispatched | agent-c (general-purpose) | [003-day-7-status.md](003-day-7-status.md) |

## Round 2 — Build + review

_Populated after Round 1 synthesis._

---

## Initial environment snapshot (orchestrator)

- 13 migration files in `supabase/migrations/` (plan baseline = 6; 7 follow-ups). Migrations 008–012 iterate on display status, 013 adds `office_state`.
- Admin routes at `app/admin/...` (literal segment, **not** the `(admin)` route group the plan calls for). Client routes use `(client)` group correctly.
- Admin routes present: `clients`, `clients/[id]`, `orders`, `orders/[order_number]`, `invoices`, `proofs/[id]/upload`, `profiles`, dashboard.
- Client routes present: dashboard, `orders`, `orders/new`, `orders/[order_number]`, `proofs/[id]`, `venues`, `account`.
- Recent commits show admin invites + per-client team management, AdvisorMax dissolution, Client Dictionary backfill, tabbed `OrdersList` on client detail.
