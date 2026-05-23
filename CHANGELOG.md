# Changelog

All notable changes to this project. Update the `## Unreleased` block in
every PR that lands a user-visible or operationally relevant change.

## Unreleased

### Added
- Initial repo scaffold: Next.js App Router, Tailwind, Supabase client trio,
  middleware, route-group layouts for `(auth)`, `(client)`, and `app/admin/`.
- Schema migrations 001–006: tables, triggers, RLS helpers, RLS policies,
  display views, Storage bucket + policies.
- ADRs 0001, 0002, 0004, 0005, 0006, 0007 accepted. ADR 0003 (magic-link
  only) rejected and superseded by 0006 (password + magic-link).
- Docs skeleton: ARCHITECTURE, DATA_MODEL, AUTH, DEPLOYMENT, RUNBOOK, TODO.
- `.cline/rules.md` and `CONTRIBUTING.md`.
- Import + RLS-verification script stubs.
- **Auth UI (Day 2):** login page with both password and magic-link paths,
  account page with password set/change, sign-out button wired into both
  shell layouts, and `lib/actions/auth.ts` for sign-in / sign-out /
  password update. Generic error copy on the login form to avoid
  user-enumeration via auth errors.
- `components/ui/Button.tsx`, `Input.tsx`, and `Card.tsx` — primitives
  shared by every form and panel going forward.
- **Venues UI (Day 3):** `/venues` page lists every venue with its
  buildings and rooms. Inline forms to add a venue, a building under
  a venue, or a room under a building. Delete cascades through the
  FK chain. `lib/db/profiles.ts` factors out the current-client lookup
  that mutating actions need to satisfy the RLS with-check.

### Decided
- AdvisorMax is a group client (one login, advisors as offices).
- Arrive Financial is *not* a group — each advisor is its own client.
- New order numbering continues the integer sequence (max+1).
- Admin URLs use a `/admin` prefix; the `(admin)` route group from the
  plan was dropped because it collided with the `(client)` routes (ADR 0007).
