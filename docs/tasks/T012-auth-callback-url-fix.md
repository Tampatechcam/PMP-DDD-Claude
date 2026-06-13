# T012 — Fix auth callback URL (route-group misread)

**Found by:** agent-b's TASK-002 app-structure audit (`tasks/002-app-structure-audit.md`).

## Problem

Next.js route groups (`(name)`) are organizational only — they don't
add to the URL. The callback route file lives at
`app/(auth)/callback/route.ts`, so its public URL is **`/callback`**,
not `/auth/callback`.

Four call sites had the wrong path baked in, which would silently
break magic-link sign-in and admin invite emails:

| File | Use |
|---|---|
| `lib/actions/admin-users.ts` × 2 | inviteUser + resendInvite `redirectTo` |
| `lib/actions/auth.ts` | magic-link `emailRedirectTo` |
| `app/admin/profiles/page.tsx` | header comment (cosmetic but misleading) |

## Approach

Find-and-replace `/auth/callback` → `/callback` in all four spots.
Verify the audit's claim against `app/(auth)/`:

```
$ ls app/(auth)/
callback
login
```

Confirmed — `callback` is a direct child of the route group, so URL is `/callback`.

## Files

- [lib/actions/admin-users.ts](../../lib/actions/admin-users.ts)
- [lib/actions/auth.ts](../../lib/actions/auth.ts)
- [app/admin/profiles/page.tsx](../../app/admin/profiles/page.tsx)

## Verification

- `grep -rn "/auth/callback"` against lib/, app/, components/ returns zero matches
- `npx tsc --noEmit` clean
- The route handler at `app/(auth)/callback/route.ts` already exchanges `?code=` for a session and redirects to `?next=` — no change needed there
