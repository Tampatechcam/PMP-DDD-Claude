# Memory

## Me

**Cam Hebeler** — building PMP Client Dashboard. Email: `camhebeler@gmail.com`.

Active project + only project tracked here right now. Working solo plus
parallel Claude agents on `feature/admin-views`.

## Project

**PMP Dashboard** — Next.js 14 (App Router) + Supabase + Tailwind. Client
portal + ops admin shell for Power Mailers Plus, a direct-mail marketing
service for financial advisors running retirement-planning seminars.

- **Repo:** `C:\Users\cah50\Downloads\PMP DDD CLaude`
- **Active branch:** `feature/admin-views` (Day-7 deliverables landed plus 5 days of follow-on work)
- **Deployment:** Vercel (Site URL hooked into Supabase auth)
- **DB:** Supabase project `amtunktskgwvvqumrbde`, 13 migrations applied + tracked

## Groups vs. independents

| Client | Status | Notes |
|---|---|---|
| **FTA** | Group | "Financial & Tax Architects" — 7 advisor offices: FTA STL, FTA CHI, FTA NSV, FTA TX, FTA STL SS, David Jones (SC), Justin Yoo (MD). ~173 orders. |
| **Sentinel/SAM RIA** | Group | "Sentinel Asset Management" — Will Warner's 3 state offices (CT, MD, PA). ~45 orders. |
| **AdvisorMax** | Dissolved | Was a group; per user direction each member is now independent. Andy Urso is the lone remaining "AdvisorMax member" client. |
| **Arrive Financial Services** | Group label, no orders yet | Listed but no rows in DB. |
| 36 independents | Solo | Bone Asset, Scout Financial, Eagle, Mason Street Wealth, McGuire, Professional Group, Foguth, etc. |

## Terms (glossary essentials)

| Term | Meaning |
|---|---|
| **DM** | Direct Mail — physical mailer that drives seminar attendance |
| **Order Sent Deadline** | Monday 4 weeks before the event — when production must start (mailer must be in mailboxes 2 weeks before event; 5–8 days from order placement) |
| **R101 / R90** | Retirement 101 / 90 — flagship seminar classes |
| **W101** | Women's Retirement 101 |
| **SS101** | Social Security 101 |
| **Order #NNN** | DM order from the official sheet (e.g. #651–#967) |
| **DIG-NNN** | Synthetic ID for digital-only orders (`DIG-001`–`DIG-118`) — those rows have no source order number, so we mint a separate slug. See [T003](docs/tasks/T003-dig-display-ref.md). |
| **dm_status / digital_status** | Raw status from the source sheets ("Order Sent", "All Details Added", etc.) — used by the `orders_with_display_status` view |
| **display_status** | The view's computed status (proof state wins over dm_status wins over digital_status wins over 'Submitted') |
| **PSR** | Not used in this project (came from the skill template — ignore) |

## Architecture cheat-sheet

- **Three Supabase clients only:** `lib/supabase/{server,client,admin}.ts`. No fourth init file anywhere.
- **One data layer:** all DB reads go through `lib/db/*.ts`; no raw `.from()` in pages/components (Operating principle #3, enforced in R001).
- **Server Components by default:** Client islands only where interaction is needed (proof actions, invite form, resend button, etc.).
- **Auth callback URL:** `/callback` — NOT `/auth/callback` (`(auth)` route group is path-free). Fixed in T012/R005.

## Multi-agent task system

This project uses **parallel Claude agents on non-overlapping scope**. The dispatch board is `tasks/INDEX.md`:

- `tasks/NNN-slug.md` — Round-1 audit reports (agents a/b/c)
- `tasks/Rxxx-slug.md` — Round-2 build tasks (claude × N, claude orchestrator, security/design agents)
- `tasks/DSxxx-slug.md` — Design-system audits
- `tasks/Vxxx-slug.md` — Verify agents

**Cardinal rule:** never work on a file another agent is mid-flight on. Check INDEX before claiming work; update INDEX to claim before touching the file.

## Preferences

- **Don't ask for permission for obvious next steps** — Cam moves fast and prefers execution. Surface ambiguity only when it changes the next action.
- **Commit often, descriptively.** Each shipped task gets its own commit with a body that reads like a small ADR. Co-Authored-By trailer on each.
- **MD per task.** Every shipped task gets a retrospective at `docs/tasks/Txxx-*.md` — what / why / approach / files / verification.
- **Never bypass safety hooks.** Don't `--no-verify` on commits. Don't disable RLS or `security_invoker` casually.
- **Branch protection:** `main` doesn't exist yet — currently working off `feature/admin-views`. Need to cut `main` before any merge.

## See also

- [docs/tasks/README.md](docs/tasks/README.md) — full retrospective archive (T001-T019+)
- [docs/TODO.md](docs/TODO.md) — project backlog
- [memory/](memory/) — extended profiles for people / projects / glossary
