# TASK-R005 — Sync docs to actually-shipped `/callback` URL

**Status:** dispatched
**Owner:** claude
**Scope:** Doc consistency after T012 fixed the code.
**Source:** [002-app-structure-audit.md §Gap-1](002-app-structure-audit.md)

## Problem

T012 (`feature/admin-views @ 593a732`) fixed the live code to use the
correct `/callback` URL — the route file at `app/(auth)/callback/`
resolves to `/callback` (Next route groups are path-free). Four docs
still reference the old (wrong) `/auth/callback` and would mislead a
reader trying to wire up Supabase dashboard config.

## Files

- `docs/AUTH.md` — line 27
- `docs/ARCHITECTURE.md` — line 43
- `docs/decisions/0006-password-plus-magic-link.md` — line 32
- `docs/decisions/0007-admin-url-prefix.md` — line 37

## Verification

- `grep -rn "/auth/callback" docs/` returns zero matches
- All four docs now reference `/callback` (or the absolute Vercel URL `https://…/callback`)
