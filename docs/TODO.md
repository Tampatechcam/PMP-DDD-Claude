# TODO

Out-of-scope parking lot. Active work lives in the live TaskList and
shipped work lives in [docs/tasks/](tasks/README.md).

## Day-1 follow-ups (mostly done)

- [x] Run `npm install`, commit `package-lock.json`.
- [x] Create the Supabase project, fill in `.env.local` and Vercel env vars.
- [x] Apply migrations against the prod DB — through **013** (`offices.state`); all registered in `supabase_migrations.schema_migrations`.
- [ ] Regenerate `types/db.ts` (`npm run db:types`) — out of date after migrations 012 + 013.
- [x] AdvisorMax dissolved per user direction; Andy Urso is his own independent client now (see [T008](tasks/T008-dissolve-advisormax.md)). The "AdvisorMax = group" decision in ADR 0004 is now historical context — Arrive remains the only non-FTA, non-Sentinel group designation in the codebase.
- [x] Auth = password + magic-link, both available (ADR 0006).
- [x] Order numbering = integer max+1; digital-only orders display as `DIG-NNN` via `display_ref` ([T003](tasks/T003-dig-display-ref.md)).

## Active (tracked in the TaskList)

- Regenerate `types/db.ts` after migrations 012 + 013
- ~~Patch `import-v2.ts` so re-imports populate office contact + client business fields inline (avoid relying on the two backfill scripts)~~ — done; both aggregations inlined, Step 7 dropped, backfill scripts retained as idempotent fallbacks.
- Mirror office region/contact fields onto `ClientInfoCard` for order detail pages


## Recently shipped

- UX/UI uplift: dark mode + theme toggle, mobile-responsive shell
  (drawer + top bar), global ⌘K command palette, admin "Needs
  attention" rail, removable filter chips on /admin/orders, inline
  PDF proof viewer, toast notifications on proof decisions, new
  shared primitives (`Toast`, `EmptyState`, `Skeleton`, `Avatar`,
  `Kbd`, `Badge`). See `CHANGELOG.md` § Unreleased / Added for the
  full list.

## Later (not yet tracked)

- [ ] Sentry or similar error reporting.
- [ ] Per-client custom branding (logo on login, color accent) —
      partially unblocked now that color tokens are CSS variables,
      a per-client theme can override `--accent` on the body tag.
- [ ] Email digest of new orders / proof decisions.
- [ ] Saved-views for /admin/orders (persist a named filter set
      in localStorage; the URL is already the source of truth so
      this is just bookmark management).
- [ ] Keyboard shortcuts cheat sheet (Shift-? overlay) listing
      ⌘K + the row-level shortcuts we want next (j/k to move,
      enter to open, esc back).
- [ ] Real-time updates via Supabase Realtime — proof status flips
      should land in the client portal without a refresh.
- [ ] Bulk actions on /admin/orders (multi-select rows → set status,
      assign mailer type, export).
- [ ] Admin venue management UI under `/admin/clients/[id]/venues` —
      right now an admin visiting `/venues` sees the client-facing page
      with venues from *all* clients (RLS doesn't filter by client_id for
      admins) and the create form will fail because admin profiles have
      `client_id = null`. Acceptable for v1, but a real admin path is
      cleaner.
- [ ] Edit-in-place for venues / buildings / rooms (currently only
      create + delete-cascade).
- [ ] Custom SMTP for Supabase auth invites — built-in mailer is rate-limited to 2/min (`rate_limit_email_sent = 2`), blocks real-volume invite testing. Needed before onboarding more than a handful of users.
- [ ] Custom invite email template / branded copy (Supabase Studio).
- [ ] "Remove user" / "Disable user" admin action — current `/admin/profiles` is invite-only.
- [ ] Let `client_user` role invite their own teammates (RLS already permits — just need a scoped UI on the client-side).
- [ ] Hierarchical clients-tab view — collapse FTA to show STL/CHI/NSV/TX/STL SS/David Jones/Justin Yoo as expandable children rather than a flat list.
