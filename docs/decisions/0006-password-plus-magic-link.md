# 0006 — Password + magic-link, both available

**Status:** Accepted · 2026-05-23 · supersedes [ADR 0003](0003-magic-link-vs-password.md)

## Context

ADR 0003 proposed magic-link-only. Concern raised: some firms' IT setups
make link delivery unreliable, and some users prefer a password they can
type rather than fish a link out of an inbox each time. Magic-link is still
the lowest-friction path for first-time sign-in and reset; passwords are
the lowest-friction path for daily users.

## Decision

The login page offers both, with one as the default and the other behind
a one-click toggle:

```
[ Email                            ]
[ Password                         ]
[ Sign in ]
                                — or —
[ Email me a sign-in link instead ]
```

### Flows

- **Password sign-in:** `supabase.auth.signInWithPassword({ email, password })`
  from a Client Component. Wrong-credential error stays generic ("email
  or password is incorrect") — no user-enumeration via the error message.
- **Magic-link sign-in:** `supabase.auth.signInWithOtp({ email })`. Same
  `/callback` Route Handler closes the loop as before. (The handler
  lives in `app/(auth)/callback/route.ts`; the `(auth)` group is path-free
  so the public URL is `/callback`, not `/auth/callback`.)
- **First sign-in:** admin sends a magic link. After the user is in, they
  can set a password from `/account` if they want one.
- **Forgot password:** "Email me a sign-in link" *is* the reset path. After
  clicking through, the user can set a new password from `/account`. No
  separate reset-link template needed.

### Account page

`/account` gets a "Set a new password" section that calls
`supabase.auth.updateUser({ password })`. Visible to all signed-in users.

## Consequences

- Two paths to test, two paths to keep working. Worth it for the support
  cost saved on firms with unreliable email.
- The "set a password" flow is opt-in — users who don't set one stay on
  magic-link forever, which is fine.
- The login page has slightly more UI than the magic-link-only version
  envisioned in ADR 0003. The "send me a link instead" affordance stays a
  one-click toggle so we don't blow past the design system's "single
  primary action per page" rule.

## What this changes in the plan

- `app/(auth)/login/page.tsx` ships with email + password fields and a
  toggle to magic-link mode.
- `docs/AUTH.md` § "How a session is established" describes both flows.
- No schema change — Supabase Auth already stores password hashes.

## Alternatives considered

- **Magic-link only (ADR 0003).** Lower surface area; rejected for the
  reasons above.
- **SSO (Google/Microsoft) only.** Out of scope for v1; firms have
  heterogeneous OAuth scopes.
