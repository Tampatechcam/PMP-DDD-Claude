# Cline rules for this repo

Read every session. The implementation plan
(`PMP Dashboard — Implementation Plan.markdown`) is the source of truth;
these rules are how you stay aligned with it.

## Before any task

1. Confirm not on `main`. Create a branch first (`feature/`, `fix/`,
   `chore/`, or `db/`).
2. Read the implementation plan section that covers the task, plus the
   relevant `/docs` file.
3. Check `supabase/migrations/` for the current schema state.
4. Use Supabase MCP to verify DB state before writing DB code.

## While working

- **One concern per PR.** Side issues go to `docs/TODO.md`, not into the
  current diff.
- **Never edit an applied migration.** Write a new one.
- **No service-role key outside `lib/supabase/admin.ts`.** `import 'server-only'`
  is there for a reason; don't paper over the build error.
- **All DB access via `lib/db/*` or `lib/actions/*`.** No `supabase.from()`
  scattered through components or pages.
- **Match existing patterns.** No parallel components doing the same job.
  If you find duplication, delete one — don't add a third.
- **Server Components by default.** `'use client'` only for state, events,
  or browser APIs.

## Before declaring done

1. `npm run build` passes with no warnings.
2. `npx tsc --noEmit` is clean.
3. DB types regenerated if the schema changed (`npm run db:types`).
4. `/docs` updated for the affected area.
5. `CHANGELOG.md` updated under "Unreleased".
6. ADR added in `docs/decisions/` if the decision is non-obvious.

## Forbidden without explicit human approval

- Deleting files (move to `.archive/` if unsure).
- Editing applied migrations.
- Changing `.env.example` or Vercel config without a paired docs update.
- Adding a top-level dependency.
- Force-pushing.
- Running `scripts/import-sheets.ts` (it needs human confirmation of the
  AdvisorMax / Arrive groupings first).

## Big-task gate

Any of the following counts as "big" and requires a docs update **before**
code:

- Auth or RLS changes.
- New table, new column, or any migration.
- New third-party service or library.
- Deploy config or env var change.
- Refactor that moves more than five files.

If you can't describe the change in a paragraph, don't write it.
