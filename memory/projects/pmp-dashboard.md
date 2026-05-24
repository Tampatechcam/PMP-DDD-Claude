# PMP Dashboard

**Status:** Active build · Day-7 deliverables landed + 5 days of follow-on work on `feature/admin-views`
**Repo:** `C:\Users\cah50\Downloads\PMP DDD CLaude`
**Tracker:** [`tasks/INDEX.md`](../../tasks/INDEX.md) (multi-agent dispatch board)
**Plan source:** `PMP Dashboard — Implementation Plan.markdown` at repo root

## What is it

A two-shell Next.js app:

- **Client portal** (`app/(client)/`) — financial advisors see their orders, proofs, venues, account
- **Admin shell** (`app/admin/`) — ops manages clients, orders, invoices, profiles/users for everyone

PMP = Power Mailers Plus. Service is: design + print + mail seminar invitations for financial advisors running retirement-planning classes. The dashboard tracks one "order" = one seminar campaign (DM + digital).

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 App Router |
| UI | React Server Components + small client islands; Tailwind |
| DB | Supabase Postgres (project ref `amtunktskgwvvqumrbde`) |
| Auth | Supabase Auth (password + magic-link) — see [`docs/AUTH.md`](../../docs/AUTH.md) |
| Hosting | Vercel (production target = `main` branch — not yet cut) |
| Types | `types/db.ts` regenerated via Management API typescript endpoint |

## Data scale (current)

- 40 clients (2 groups + 38 independents; AdvisorMax was a 3rd group, dissolved)
- 54 offices
- 325 orders (207 DM + 118 digital-only)
- 2 auth users (demo accounts) — no production users yet

## Source of truth

- **DM orders:** `scripts/.import-work/direct-mail.csv` (Google Sheet export)
- **Digital orders:** `scripts/.import-work/digital-jobs.md` (Google Sheet → md)
- **Client info:** `scripts/.import-work/client-dict.md` (two concatenated tables with different column orders — parser handles both)

Never the "Main Order Sheet" — per user direction, ignored.

## Operating principles

1. **Migrations are the schema** — never edit an applied migration; add a new one
2. **Three Supabase clients** — `lib/supabase/{server,client,admin}.ts` and nothing else
3. **One data layer** — `lib/db/*.ts` server-side functions; no raw `.from()` in pages
4. **RLS owns security** — middleware refreshes the session but doesn't gate
5. **Server Components by default** — client islands only where interactivity needed
6. **Route groups for shell only** — `(auth)`, `(client)` add no URL segment; `admin/` is a literal segment (ADR 0007)

## Active follow-ups

See [`docs/TODO.md`](../../docs/TODO.md) and the "Active" / "Waiting On" sections of [`TASKS.md`](../../TASKS.md).

## Branch protocol

- One feature per `feature/<name>` branch
- Squash-merge to `main` (when `main` exists)
- Branch protection on `main`: PR review required
- `feature/admin-views` is the de-facto trunk right now — needs `main` cut before any merge

## Shipped retrospectives

See [`docs/tasks/README.md`](../../docs/tasks/README.md) for T001–T019+ retrospectives (every shipped task gets one).
