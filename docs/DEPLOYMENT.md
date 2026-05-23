# Deployment

## Topology

- **Vercel** — hosts the Next.js app. One project, one production deploy
  per merge to `main`. Preview deploy per PR.
- **Supabase** — one project, two environments: a local dev DB
  (`supabase start`) and the hosted prod DB. No staging — preview deploys
  point at prod, gated by RLS.

## First-time setup

1. `supabase init` and `supabase link --project-ref <REF>`.
2. Apply migrations: `supabase db push`.
3. Generate types: `npm run db:types`.
4. Create Storage bucket via migration 006 (handled).
5. In Supabase → Auth → URL Configuration set Site URL + redirect URLs.
6. In Vercel, set env vars (see `docs/AUTH.md`). Redeploy.

## Per-PR flow

1. Branch: `feature/<name>` etc. — see CONTRIBUTING.md.
2. Vercel auto-deploys a preview on push.
3. Self-review the diff, click through the preview, verify the change.
4. Squash-merge; production deploys automatically.
5. Verify production. Delete the branch.

## Common Vercel failures

In order of how often they bite:

1. **Env vars missing or only set for Production.** Fix: set for all three
   environments + redeploy.
2. **Type error during build.** Fix: `npx tsc --noEmit` locally first.
   Don't `// @ts-expect-error` your way past a real type issue.
3. **`import 'server-only'` violation.** Fix: stop importing
   `lib/supabase/admin.ts` from a Client Component or a shared module.
4. **Node version mismatch.** Fix: `"engines": { "node": ">=20" }` already
   set; pin Vercel project to Node 20.
5. **PDF upload too large for Server Action.** Fix: client uploads directly
   to Storage with a signed upload URL — see ADR 0005.

## Storage uploads

PDFs are 6–20 MB. They never traverse a Server Action. Flow:

1. Admin clicks Upload → server issues a signed upload URL.
2. Browser PUTs the file straight to Storage at
   `proofs/{client_id}/{order_number}/{version}.pdf`.
3. On success, a Server Action inserts the `proofs` row and an
   `order_events` audit row.

## Rollback

- **Code:** redeploy the previous Vercel build (one click).
- **Schema:** never edit an applied migration. Write a new migration that
  undoes the change. The `supabase/migrations/` directory is the schema's
  history.
- **Storage:** the bucket is versioned by path. Old versions are read-only
  history; uploading `v3` does not overwrite `v2`.
