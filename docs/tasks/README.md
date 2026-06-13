# Tasks

One markdown file per shipped task. The index is chronological — `T001`
is the earliest, `Txxx` is the latest. Each doc captures:

- **What** the task did (one-line summary)
- **Why** it was needed (the problem prompting it)
- **Approach** (the design decision)
- **Files touched**
- **Verification** (how we confirmed it works)
- **Commit hash** for traceability

New tasks go in here as they're picked up. If a task is in flight, see
the active TaskList — once it lands, drop a permanent doc here.

## Index

| ID | Commit | Title |
|---|---|---|
| [T001](T001-past-tab-strict-date.md) | `accd961` | Past tab = strict past event date; hide future Order Sent |
| [T002](T002-consolidate-duplicate-clients.md) | `09872c5` | Consolidate digital-sheet duplicate clients into their firms |
| [T003](T003-dig-display-ref.md) | `b621aca` | `DIG-NNN` display_ref for digital-only orders |
| [T004](T004-office-region-contact.md) | `106e067` | Region + contact info on each office card |
| [T005](T005-office-2col-grid.md) | `279f77a` | 2-col office grid for group clients only |
| [T006](T006-tabbed-orderslist-on-client.md) | `ff62cd8` | Use tabbed OrdersList on the client detail page |
| [T007](T007-client-business-backfill.md) | `6cb4204` | Backfill client business/defaults/pricing/notes |
| [T008](T008-dissolve-advisormax.md) | `27fa540` | Dissolve AdvisorMax group; Andy Urso becomes own client |
| [T009](T009-admin-invite-and-team.md) | `f39a0df` | Invite users + per-client team management + DB sync |
| [T010](T010-admin-shell-order-links.md) | `d36ef6b` | Order links from admin pages stay in the admin shell |
| [T011](T011-gitignore-claude-local.md) | `4ef9ef2` | Gitignore `.claude/settings.local.json` |
| [T012](T012-auth-callback-url-fix.md) | _pending_ | Fix auth callback URL (`/auth/callback` → `/callback`) |
| [T013](T013-hoist-raw-from-calls.md) | _pending_ | Hoist raw `supabase.from('…')` calls into `lib/db/*` |
| [T014](T014-cleanup-batch.md) | _pending_ | Cleanup batch (dead Sidebar, login gradient, account auth) |
| [T015](T015-doc-callback-url-sync.md) | _pending_ | Sync prose docs to `/callback` |
| [T016](T016-pill-primitive.md) | _pending_ | Extract shared `<Pill>` primitive (R004) |
| [T017](T017-button-href.md) | _pending_ | `<Button>` accepts `href` (R003) |
| [T018](T018-admin-orders-date-status-filters.md) | _pending_ | Date-range + `display_status` filters on `/admin/orders` (R008) |
| [T019](T019-per-invoice-detail-page.md) | _pending_ | Per-invoice detail page at `/admin/invoices/[id]` (R010) |

## Conventions

- File name: `Txxx-short-kebab-summary.md`
- Imperative title (matches the commit subject's verb)
- Cross-link with relative paths so the docs render right on GitHub
