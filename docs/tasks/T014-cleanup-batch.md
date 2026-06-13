# T014 — Cleanup batch (dead Sidebar, login gradient, account auth call)

**Source:** [tasks/R002-cleanup-batch.md](../../tasks/R002-cleanup-batch.md) · agent-b TASK-002 Gaps #3, #6, #7

## Changes

| Smell | Fix |
|---|---|
| `components/layout/Sidebar.tsx` — 5-line stub returning `null`, zero importers | `git rm` the file (admin shell uses `AdminSidebar`, client shell uses `ClientHeader`) |
| `app/(auth)/login/page.tsx:21` — `bg-gradient-to-b from-bg to-stone-100` (Part 9 says "No gradients") | Swap to flat `bg-bg` |
| `app/(client)/account/page.tsx:13-14` — fresh `createClient(); supabase.auth.getUser()`, missing the per-request `cache()` wrapper | Import + use `getAuthUser` from `lib/db/auth.ts` (already wrapped in React `cache()`). Saves a duplicate `/auth/v1/user` round-trip per render. |

## Verification

- `git status` shows 1 delete + 2 edits + 1 expected modification to `app/(client)/account/page.tsx`
- `npx tsc --noEmit` clean
- `/login` renders with flat background
