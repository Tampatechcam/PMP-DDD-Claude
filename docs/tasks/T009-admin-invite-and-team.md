# T009 — Invite users + per-client team management + DB sync

**Commit:** `f39a0df` · `feat(admin): invite users + per-client team management + db sync`

## Problem

User direction: "I need a setting to add a user and send out their
auth email also a way to (s)end auth emails to their team members
they may have join. also is the db up to date".

Three things in one ship:

1. Admin-only invite-user flow (sends Supabase auth invite email)
2. Per-client Team section with Resend invite for pending members
3. Verify the DB is in sync with the on-disk migrations

## Approach

### 1. Server Actions

[lib/actions/admin-users.ts](../../lib/actions/admin-users.ts):

- `inviteUser({ email, role, clientId?, fullName? })` — calls
  `supabaseAdmin.auth.admin.inviteUserByEmail`, then UPDATEs the
  auto-created profile row (the `on_auth_user_created` trigger
  inserts as `role='client'` by default) with the intended role +
  `client_id`. Redirect target is
  `/auth/callback?next=/admin` or `/orders` depending on role.
- `resendInvite(userId)` — refuses if `email_confirmed_at` is set;
  otherwise re-fires the same invite for users still waiting on their
  first sign-in.

Both gated by the existing `requireAdmin()` pattern from
[lib/actions/proofs.ts](../../lib/actions/proofs.ts).

### 2. UI

[components/admin/InviteUserForm.tsx](../../components/admin/InviteUserForm.tsx)
client component lives in two places:

- `/admin/profiles` — full form (email + role + client picker)
- `/admin/clients/[id]` — scoped (locked to `role=client` + this client_id)

[components/admin/TeamSection.tsx](../../components/admin/TeamSection.tsx)
server component lists profiles linked to a client, joins email from
`auth.users` via the service-role admin client (same pattern as
[lib/db/profiles.ts:adminListProfiles](../../lib/db/profiles.ts)).
Per-member Resend button rendered only for users whose
`email_confirmed_at` is null.

### 3. DB sync

Migrations 012 (`display_ref`) and 013 (`offices.state`) were applied
via the Management API ad-hoc earlier in the session and weren't
tracked. Inserted both into `supabase_migrations.schema_migrations` so
a future `supabase db push` is a no-op.

### Sidebar tweak

Relabelled the `Profiles` nav item to `Users` (route unchanged).

## Files

- [lib/actions/admin-users.ts](../../lib/actions/admin-users.ts) (new)
- [components/admin/InviteUserForm.tsx](../../components/admin/InviteUserForm.tsx) (new)
- [components/admin/TeamSection.tsx](../../components/admin/TeamSection.tsx) (new)
- [components/admin/ResendInviteButton.tsx](../../components/admin/ResendInviteButton.tsx) (new)
- [app/admin/profiles/page.tsx](../../app/admin/profiles/page.tsx) — adds the invite form above the table
- [app/admin/clients/[id]/page.tsx](../../app/admin/clients/[id]/page.tsx) — adds `<TeamSection>` between Offices and Orders
- [components/layout/AdminSidebar.tsx](../../components/layout/AdminSidebar.tsx) — label change

## Verification

- `/admin/profiles` renders the invite form above the table
- `/admin/clients/<FTA-id>` shows `Team (1)` with the demo client account marked Active
- `supabase_migrations` table top-4: 013 office_state, 012 display_ref, 011 ignore_main_status, 010 prefer_workflow_status
- Smoke-tested: trigger creates profile, role/client_id update sticks, Resend refuses confirmed users, all input validation paths reject correctly
- `npx tsc --noEmit` clean

## Follow-ups flagged

- Custom invite email template / branded copy in Supabase Studio
- Custom SMTP if invite volume exceeds Supabase's built-in 2/min rate limit (current `rate_limit_email_sent = 2`)
- "Remove/disable user" admin action
- Let `client_user` role invite their own teammates (RLS already permits)
