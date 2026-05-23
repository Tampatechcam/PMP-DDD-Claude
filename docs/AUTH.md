# Auth

## Rules

1. **Supabase Auth + RLS is the only auth model.** No custom JWT, no auth
   context, no parallel session logic.
2. **Three Supabase clients only.** `lib/supabase/{server,client,admin}.ts` —
   any fourth is a bug.
3. **Service role never crosses to the browser.** `import 'server-only'` in
   `lib/supabase/admin.ts` makes the build fail if it does.
4. **UI guards are convenience, not security.** RLS already prevents reads;
   the layout `redirect()` is just to keep users out of dead pages.

## How a session is established

Two paths, both available on the login page (see ADR 0006).

**Password path** (default if the user has set one):
1. User submits email + password at `/login`.
2. `supabase.auth.signInWithPassword({ email, password })` from a Client
   Component sets the session cookies directly.
3. `middleware.ts` refreshes the cookies on every subsequent request.

**Magic-link path** (one click away, also the "forgot password" path):
1. User clicks "Email me a sign-in link instead" and submits their email.
2. `supabase.auth.signInWithOtp({ email })` emails a link.
3. Link points to `/auth/callback?code=...&next=/orders`.
4. The callback Route Handler exchanges the code for a session and sets the
   auth cookies on the response.
5. From `/account`, the user can then set a password if they want one.

## How a profile is created

The `on_auth_user_created` trigger fires on `auth.users` insert and inserts
one row into `public.profiles` (role = 'client', client_id = null). An admin
links the profile to a client via the admin UI; the first admin promotes
itself manually:

```sql
update public.profiles set role = 'admin' where id = '<your-auth-uid>';
```

## The "one login per group" rule

Group clients get **one** Supabase user that maps to **one** `clients` row.
Multi-office UX comes from the office switcher in `?office=<id>`, not from
multiple logins.

Confirmed groups (one login covers all offices): **FTA, Sentinel/SAM RIA,
AdvisorMax**.

Confirmed *not* groups (one login per advisor): **Arrive Financial** —
each advisor under it is an independent `clients` row.

See ADR 0004.

## Vercel env vars (the #1 failure mode)

Set all three in **Production, Preview, and Development**:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # mark as Sensitive
```

Then redeploy — `NEXT_PUBLIC_*` are baked in at build time.

In Supabase → Auth → URL Configuration:
- **Site URL:** the production Vercel domain.
- **Redirect URLs:** the production domain + `http://localhost:3000`.

If sign-in works locally but breaks on Vercel, this is the cause 90% of the
time. The other 10%: stale build that ran before the env vars were set.

## What we deleted from the old codebase

See Part 18 of the implementation plan. In one line: the old hand-rolled
`AuthContext`, `useAuth`, client-side role checks, and manual JWT
verification middleware are gone.
