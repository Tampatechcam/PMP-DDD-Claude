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
- [ ] Admin venue management UI under `/admin/clients/[id]/venues` —
      right now an admin visiting `/venues` sees the client-facing page
      with venues from *all* clients (RLS doesn't filter by client_id for
      admins) and the create form will fail because admin profiles have
      `client_id = null`. Acceptable for v1, but a real admin path is
      cleaner.
- [ ] Edit-in-place for venues / buildings / rooms (currently only
      create + delete-cascade).
