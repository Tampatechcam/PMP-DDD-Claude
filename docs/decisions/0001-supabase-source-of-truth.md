# 0001 — Supabase is the single source of truth

**Status:** Accepted · 2026-05-23

## Context

The current build keeps data in both Google Sheets and Supabase and tries to
sync them. The sync logic is the root of most outages: ID drift, duplicate
rows, races between manual edits and automated writes, and a schema that
nobody can describe in one place.

## Decision

After a one-time import (`scripts/import-sheets.ts`), the five Sheets are
archived read-only. New orders, proofs, invoices, and profile changes happen
in Supabase only. There is no two-way sync. The Sheets directory becomes a
historical artifact, not a live system.

The schema lives in `supabase/migrations/`. Every change to Postgres is a
new migration file committed to git. No edits in the Supabase dashboard SQL
editor; no edits to applied migrations.

## Consequences

- One place to look for what's true. One place to change it.
- The import script is a one-shot — it runs, we verify, we delete it.
- We lose the ability to "just edit a row in Sheets." That's the point.
- A schema change requires a PR + a migration, which is slower than a SQL
  editor click but reversible and reviewable.

## Alternatives considered

- **Keep Sheets as the source of truth, mirror to Postgres.** Rejected — this
  is what we have today and it doesn't work.
- **Keep both, treat Postgres as the OLTP and Sheets as the warehouse.**
  Rejected — adds a second consistency boundary for no gain.
