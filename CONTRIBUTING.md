# Contributing

## Branching

- `main` is protected; Vercel auto-deploys it to production.
- Work happens on `feature/<name>`, `fix/<name>`, `chore/<name>`,
  or `db/<name>`.
- Branches stay under three days. If yours is older, split it.
- Squash-merge to `main`. Vercel preview per PR.

## The task cycle

```
read plan + relevant /docs
→ git checkout -b feature/<name>
→ update docs FIRST if architecture / data / auth / deploy changes
→ implement
→ test locally + Supabase MCP if DB is touched
→ commit migration + generated types in the same commit
→ push, open PR, click through the Vercel preview
→ self-review the diff
→ update CHANGELOG.md under "Unreleased"
→ squash-merge
→ verify in production
→ delete branch
```

"Big task" = anything touching auth/RLS, schema, third-party integrations,
deploy config, or moving more than five files. Big tasks update docs
**before** code.

## What "done" means

Every PR:

- `npm run build` passes with no warnings.
- `npx tsc --noEmit` clean.
- DB types regenerated if the schema changed.
- Affected `/docs` file updated.
- `CHANGELOG.md` updated under "Unreleased".
- ADR added in `docs/decisions/` if the decision is non-obvious.

## What's forbidden without explicit approval

- Deleting files (move to `.archive/` if unsure).
- Editing an applied migration (write a new one instead).
- Changing `.env.example` or Vercel config without a paired docs update.
- Adding a top-level dependency without an ADR.
- Force-pushing.

## SQL rules

- The schema lives in `supabase/migrations/`. The dashboard SQL editor
  is for reads only.
- Migration filenames are `YYYYMMDDhhmmss_<slug>.sql`, lowercase.
- Migrations are append-only — once applied to prod, they are immutable.
  Need to undo something? Write a forward migration that undoes it.

## Code rules (TL;DR — full version in `.cline/rules.md`)

- One concern per PR. Side issues → `docs/TODO.md`.
- No service-role key outside `lib/supabase/admin.ts`.
- All DB access via `lib/db/*` or `lib/actions/*`.
- Match existing patterns. No parallel components doing the same thing.
- Server Components by default; `'use client'` only when you need it.
