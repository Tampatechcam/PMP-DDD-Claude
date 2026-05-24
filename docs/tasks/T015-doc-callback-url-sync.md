# T015 — Sync docs to actually-shipped `/callback` URL

**Source:** [tasks/R005-doc-callback-url-sync.md](../../tasks/R005-doc-callback-url-sync.md) · follows T012 (code fix)

## Problem

T012 fixed the live code to use `/callback` (the real URL — the `(auth)`
route group is path-free). Four prose docs still referenced the old
wrong `/auth/callback` and would mislead anyone wiring up Supabase
dashboard config or grokking the auth flow.

## Files

- `docs/AUTH.md:27` — magic-link path step 3
- `docs/ARCHITECTURE.md:43` — auth flow paragraph
- `docs/decisions/0006-password-plus-magic-link.md:32` — ADR
- `docs/decisions/0007-admin-url-prefix.md:37` — URL tree example

Each updated to say `/callback` and includes a one-line aside noting
the `(auth)` group's path-free behavior — so future readers don't make
the same mistake T012 caught.

## Why not move the route file?

Agent-b's audit proposed the alternative fix: move `app/(auth)/callback/`
to `app/auth/callback/` (literal segment, matching ADR 0007's `admin`
pattern). T012 chose the other direction — fix the callers — because
that was 4 line-edits vs a file move + redirect-URL update in the
Supabase dashboard. Either is correct; we're documenting the chosen
shape.

## Verification

- `grep -rn "/auth/callback" docs/ --exclude-dir=tasks` returns only the explanatory `"/callback", not "/auth/callback"` text I added — no stale references in prose
- `docs/tasks/T012*` retains the old URL for historical accuracy
