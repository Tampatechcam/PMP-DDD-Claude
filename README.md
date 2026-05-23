# PMP Dashboard

Client portal for PMP direct mail + digital orders. Next.js (App Router) on
Vercel, Supabase for Postgres + Auth + Storage. Authenticated portal where
advisor clients place orders, see job history, and approve/revise 6–20 MB
PDF mailer proofs.

The implementation plan lives at the repo root:
`PMP Dashboard — Implementation Plan.markdown`. Read it first.

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PROJECT_REF.

# 3. Apply migrations against your Supabase project
supabase link --project-ref $SUPABASE_PROJECT_REF
supabase db push

# 4. Generate DB types
npm run db:types

# 5. Run dev server
npm run dev
```

Then sign in once at <http://localhost:3000/login>, and promote yourself to
admin (see `docs/AUTH.md` § "How a profile is created").

## Where to look

- `docs/ARCHITECTURE.md` — boundaries, layers, what owns what.
- `docs/DATA_MODEL.md` — entities + why the schema is shaped this way.
- `docs/AUTH.md` — sign-in, RLS, env vars.
- `docs/DEPLOYMENT.md` — Vercel + Supabase setup, common failure modes.
- `docs/RUNBOOK.md` — when something breaks in production.
- `docs/decisions/` — ADRs (5+ before launch).

## House rules

1. **Write the doc first** for anything non-trivial.
2. **Branch always.** Squash-merge. <3-day branches.
3. **Migrations are the schema** — never edit an applied migration.
4. **All DB access through `lib/db/*` or `lib/actions/*`** — never raw
   `supabase.from()` in components.

See `.cline/rules.md` for the agent rules and `CONTRIBUTING.md` for human
ones.
