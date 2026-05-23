# Changelog

All notable changes to this project. Update the `## Unreleased` block in
every PR that lands a user-visible or operationally relevant change.

## Unreleased

### Added
- Initial repo scaffold: Next.js App Router, Tailwind, Supabase client trio,
  middleware, route-group layouts for `(auth)`, `(client)`, `(admin)`.
- Schema migrations 001–006: tables, triggers, RLS helpers, RLS policies,
  display views, Storage bucket + policies.
- ADRs 0001, 0002, 0004, 0005, 0006 accepted. ADR 0003 (magic-link only)
  rejected and superseded by 0006 (password + magic-link).
- Docs skeleton: ARCHITECTURE, DATA_MODEL, AUTH, DEPLOYMENT, RUNBOOK, TODO.
- `.cline/rules.md` and `CONTRIBUTING.md`.
- Import + RLS-verification script stubs.

### Decided
- AdvisorMax is a group client (one login, advisors as offices).
- Arrive Financial is *not* a group — each advisor is its own client.
- New order numbering continues the integer sequence (max+1).
