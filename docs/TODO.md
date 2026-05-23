# TODO

Park out-of-scope work here so the current PR stays focused. Move items to a
real issue once they're scheduled.

## Day 1 follow-ups

- [ ] Run `npm install`, commit `package-lock.json`.
- [ ] Create the Supabase project, fill in `.env.local` and Vercel env vars.
- [ ] Apply migrations 001–006 against the prod DB (`supabase db push`).
- [ ] Regenerate `types/db.ts` (`npm run db:types`).
- [x] AdvisorMax = group, Arrive Financial = independent firms (ADR 0004).
- [x] Auth = password + magic-link, both available (ADR 0006).
- [x] Order numbering = integer max+1 — needs a Postgres sequence wired up
      after import sets the starting value. Defer to Day 5 (order form).

## Later

- [ ] Sentry or similar error reporting.
- [ ] Per-client custom branding (logo on login, color accent).
- [ ] Email digest of new orders / proof decisions.
