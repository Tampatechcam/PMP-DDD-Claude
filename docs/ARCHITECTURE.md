# Architecture

## One-paragraph summary

A Next.js (App Router) frontend on Vercel talks to a single Supabase project.
Postgres holds the data, Supabase Auth handles sign-in, and Storage holds the
proof PDFs. Row-Level Security is the only authorization layer — there is no
custom JWT, no auth context, no client-side role check that matters for
security. UI hides admin-only links; RLS guarantees the data behind them.

## Boundaries

```
Browser ── @supabase/ssr (anon, RLS-bound) ──▶ Postgres / Storage
Server Components / Server Actions ── @supabase/ssr (cookie session) ──▶ Postgres
Server-only "admin" client ── service role, bypasses RLS ──▶ Postgres (one-shot tasks only)
```

Three Supabase clients, no more (Part 6.1):

- `lib/supabase/server.ts` — Server Components, Route Handlers, Server Actions.
- `lib/supabase/client.ts` — Client Components only.
- `lib/supabase/admin.ts` — `import 'server-only'`. Never imported from a
  Client Component. Used by `scripts/import-sheets.ts`, `verify-rls.ts`, and
  admin-only Server Actions that need to bypass RLS.

## What lives where

| Layer | Owns | Doesn't own |
|------|------|-------------|
| SQL views / RLS | join logic, status derivation, "who can see what" | UI copy, formatting |
| `lib/db/*` | the only place `supabase.from(...)` is allowed | business rules, side effects |
| `lib/actions/*` | mutations, validation, `revalidatePath` | data shape |
| Server Components | composing data + layout | client state |
| Client Components | events, browser APIs, form state | data fetching |

If a Route Handler grows past ~30 lines, move the logic into `lib/db` or
`lib/actions` and call it from the handler. Same rule for Server Components.

## How auth works

1. Sign-in: password or magic-link (see ADR 0006).
2. The `/callback` Route Handler (defined under the `(auth)` route group
   so its public URL is `/callback`, not `/auth/callback`) trades the
   magic-link `code` for a
   session cookie.
3. `middleware.ts` refreshes the cookie on every request — it doesn't gate.
4. Layouts gate navigation with `supabase.auth.getUser()` + a role check.
   The client shell lives under the `(client)` route group (no URL prefix);
   the admin shell lives at `app/admin/*` so it has an explicit `/admin`
   URL prefix and doesn't collide with the client routes (see ADR 0007).
5. Every Postgres query runs under the user's anon JWT, so RLS does the rest.

The first admin user is promoted manually after sign-in (Part 6.4). After
that, admins flip other accounts to `role = 'admin'` from the admin UI.

## How the import works

`scripts/import-sheets.ts` runs once with the service-role key. It joins the
five Sheets on `Order Number`, writes to Postgres, and appends a per-row log
to `scripts/import-log.jsonl`. After verification, the Sheets are archived
read-only and the script is deleted.

See `docs/decisions/0001-supabase-source-of-truth.md`.
