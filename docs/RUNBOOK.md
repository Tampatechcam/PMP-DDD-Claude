# Runbook

Plays for things that go wrong in production.

## "A client says they can't log in"

1. Confirm the email exists in **Supabase → Authentication → Users**.
2. Resend the magic link from the dashboard if needed.
3. If the link 404s on the callback, check **Auth → URL Configuration** —
   the production domain must be in both Site URL and Redirect URLs.
4. If sign-in succeeds but they land on an empty orders list, their profile
   has `client_id = null`. Link the profile from the admin UI (or run:
   `update public.profiles set client_id = '<id>' where id = '<auth-uid>';`).

## "Client A can see Client B's order"

This should be impossible — assume it's a bug, not a misconfig.

1. Run `npm run verify:rls` against prod. If it passes, the leak is in the
   UI, not the database.
2. Grep for any `supabaseAdmin` import outside `lib/supabase/admin.ts` and
   `scripts/`. Service-role bypasses RLS.
3. Grep for any `.from('clients')` (base table) on a client-facing page.
   It should be `.from('client_self_view')`.

## "Proof upload fails"

1. Check file size — Server Actions cap at 1 MB. Proofs go direct to
   Storage; if they're hitting the action, the upload flow regressed.
2. Check the bucket policy in `supabase/migrations/20260523000006_storage.sql`
   is still active (`select * from pg_policies where tablename='objects'`).
3. Check `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel.

## "Build broke on Vercel"

1. Local: `npx tsc --noEmit && npm run build`.
2. Look at the Vercel build log for the failing module — `import 'server-only'`
   errors and missing env vars are the usual suspects.
3. See `docs/DEPLOYMENT.md` § Common Vercel failures.

## "Schema drift suspected"

1. `supabase db diff` — should be empty.
2. If not, generate a migration: `supabase db diff -f <name>`.
3. Never paper over with manual SQL in the dashboard.

## "Migrations have never been applied to this project"

`PGRST205: Could not find the table 'public.clients' in the schema cache`
on the first hit to the data API means the schema hasn't been pushed.

Three ways to apply, fastest first:

1. **Paste into the SQL Editor.** `supabase/migrations/_combined.sql` is
   a one-shot concatenation of `001`–`006`. Dashboard → SQL Editor → New
   query → paste → Run. Done in one click.
2. **`supabase db push`.** Requires a personal access token:
   ```
   npx supabase login                 # opens browser for PAT
   npx supabase link --project-ref <REF>
   npx supabase db push
   ```
3. **Direct DB URL.** If you have the project's DB password:
   ```
   npx supabase db push --db-url 'postgresql://postgres.<REF>:<PWD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres'
   ```

After the schema lands, `npm run db:types` regenerates `types/db.ts`.

## "Need to roll back a release"

1. Vercel → Deployments → previous → Promote.
2. If the bad release ran a migration, write a forward migration that
   reverts the schema change. Do not roll back with `git revert` on a
   migration file; the migration history is append-only.

## On-call contacts

- Supabase project: <fill me in>
- Vercel project: <fill me in>
- DNS: <fill me in>
- PMP ops lead: <fill me in>
