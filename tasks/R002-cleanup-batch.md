# TASK-R002 — Cleanup batch (dead Sidebar, login gradient, account auth call)

**Status:** dispatched
**Owner:** claude
**Scope:** Three small, independent code smells from agent-b's audit.
**Source:** [002-app-structure-audit.md §G, §H, §Gap-3,6,7](002-app-structure-audit.md)

## Items

1. **Delete `components/layout/Sidebar.tsx`** — 5-line stub returning `null`; zero importers (the admin shell uses `AdminSidebar`, client uses `ClientHeader`).
2. **Drop the login gradient** — `app/(auth)/login/page.tsx:21` uses `bg-gradient-to-b from-bg to-stone-100`. Part 9 says "No gradients". Swap to flat `bg-bg`.
3. **Memoize `account/page.tsx` auth call** — line 13-14 does `const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser()`. Layout already calls `getAuthUser()` from `lib/db/auth.ts:19` (which wraps in `cache()`). Swap to `import { getAuthUser } from '@/lib/db/auth'` for a free perf win.

## Verification

- `git status` shows the 3 file edits + 1 delete
- `npx tsc --noEmit` clean
- `/login` renders without gradient
- `/orders/account` (or wherever account page lives) still renders user info
- `grep "components/layout/Sidebar.tsx"` returns no importers
