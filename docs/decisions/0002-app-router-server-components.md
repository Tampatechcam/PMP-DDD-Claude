# 0002 — Next.js App Router with Server Components by default

**Status:** Accepted · 2026-05-23

## Context

The old build mixed `pages/` and `app/`, used a hand-rolled auth context for
client-side data fetching, and re-fetched the same data on every navigation.
The result: flashes of empty state, role checks in components, and bundles
that include the Supabase client on routes that don't need it.

## Decision

Single router: **App Router only**. Server Components are the default; we
opt into `'use client'` only for state, events, and browser APIs.

Data flows server-side:
- `lib/db/*` is the only module allowed to call `supabase.from(...)`.
- `lib/actions/*` mutate via Server Actions and `revalidatePath`.
- Client Components receive already-resolved props. They never fetch.

Three Supabase clients, no more — see Part 6 of the implementation plan.

## Consequences

- The auth cookie is read server-side; the browser bundle stays small.
- Status derivation, joins, and "what can I see" live in SQL (RLS + views),
  not React. UI can't disagree with the database.
- Adding a new screen is mostly composing data in a Server Component.
- Forms with rich interaction take a bit more care — a small Client
  Component wraps the inputs, a Server Action handles the submit.

## Alternatives considered

- **Pages Router.** Rejected — we'd be re-creating App Router's data flow
  by hand.
- **Server Components but with client-side data fetching for "interactive"
  pages.** Rejected — that's how we ended up with two data layers last time.
