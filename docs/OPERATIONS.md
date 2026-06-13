# PMP Dashboard — Operations Guide

This is the day-to-day operating procedure for running the PMP business
through the dashboard. It covers every workflow an ops admin or client
will perform: signing in, managing clients, creating orders, handling
proofs, invoicing, and finding things.

For **incident response** (something is broken), see
[RUNBOOK.md](RUNBOOK.md).
For **architecture decisions** (why the system looks the way it does),
see [`docs/decisions/`](decisions/).

---

## 1. Roles and access

The dashboard has exactly two roles, gated by Supabase RLS.

| Role | Sees | Where they sign in | Default landing |
|---|---|---|---|
| **`admin`** | Every client, every order, every invoice. Full read + write. | `/login` | `/admin` (Overview) |
| **`client`** | Only their own client's orders, proofs, venues, account. | `/login` | `/orders` |

A user's role lives on `public.profiles.role` and is **immutable from
the user side** — only an admin can change another user's role
(`profiles_admin_write` RLS policy). Self-promotion is impossible.

> See [`docs/AUTH.md`](AUTH.md) for the full auth model.

---

## 2. Signing in

### 2.1 Standard sign-in (password)

1. Go to `/login`.
2. Enter email + password.
3. On success, the redirect target depends on your role (admin →
   `/admin`, client → `/orders`).

### 2.2 Magic-link sign-in

1. On `/login`, click **"Email me a sign-in link instead"**.
2. Enter your email and submit.
3. Check your inbox for a message subject "Your sign-in link".
4. Click the link. You land on `/callback?code=…&next=/orders`, the
   server exchanges the code for a session cookie, and you're signed in.

> The callback URL is `/callback` (not `/auth/callback`). The
> `(auth)` Next.js route group is path-free — see
> [ADR 0007](decisions/0007-admin-url-prefix.md).

### 2.3 First sign-in for a newly invited user

Same as 2.2 — the invite email is functionally a magic link. After
landing on the post-callback page, the user can set a password from
`/account` if they want one.

---

## 3. Inviting users and managing teams (admin)

### 3.1 Inviting any user

1. Go to **`/admin/profiles`** (sidebar: "Users").
2. In the **Invite a user** form at the top of the page:
   - **Email** — required
   - **Name** — optional
   - **Role** — `Client` or `Admin`
   - **Client** — shown only when Role = Client. Pick from the dropdown.
3. Click **Send invite**.
4. Supabase emails the user. They click the link, hit `/callback`,
   and they're signed in with the role + client you picked.

### 3.2 Inviting a teammate for an existing client

1. Open the client's detail page: `/admin/clients/<id>`.
2. Scroll to the **Team (N)** section.
3. Use the scoped invite form below the team list. Email is the only
   field — role is locked to `client` and the client_id is pre-filled.

### 3.3 Resending an invite

1. On the client detail page's Team section, find a member whose
   status reads **"Invited · waiting for first sign-in"**.
2. Click the **Resend invite** button next to their name.
3. Supabase re-fires the same invite email. The action refuses if the
   user has already confirmed their address (status = "Active").

### 3.4 Rate limits to know

Supabase's built-in mailer is throttled to **2 emails / minute** on
this project (`rate_limit_email_sent = 2`). If you're bulk-inviting,
either pause between invites or wire up custom SMTP first
(`docs/TODO.md` "Later" section tracks this).

---

## 4. Managing clients

### 4.1 Client model

| Field group | Where edited | Notes |
|---|---|---|
| Identity | Supabase Studio (no admin UI yet) | `name`, `is_group` |
| Business | Backfilled from `client-dict.md` | `business_name`, `business_website`, `ein`, `disclaimer` |
| Defaults | Backfilled from `client-dict.md` | `default_mailer_type`, `default_class_type`, `default_mailing_quantity`, `default_digital_budget` |
| Pricing & ops (admin-only) | Backfilled from `client-dict.md` | `default_mailer_rate`, `direct_mail_discount`, `tech_sequences`, `start_before_paid`, `responsibility` |
| Offices | Backfilled from order data | One row per advisor/region, with `state`, `registration_phone`, `registration_url_direct`, `mailer_return_address` |
| Team | Invite from `/admin/profiles` or per-client page | Profiles linked via `client_id` |

### 4.2 Adding a brand-new client

Today this is a Supabase-Studio operation — there is no in-app form yet:

1. In Supabase Studio, insert a row into `public.clients`:
   ```sql
   INSERT INTO clients (name, is_group, business_name)
   VALUES ('My New Firm', false, 'My New Firm LLC');
   ```
2. Add the client's row to `scripts/.import-work/client-dict.md`
   (preserves it across re-imports).
3. Run `npx tsx --env-file=.env.local scripts/backfill-client-business.ts`
   to pull the business fields from the dictionary into the DB.
4. Invite their first user via `/admin/profiles` (see §3.1) so they can
   sign in.

### 4.3 Editing client info

Until an in-app edit form lands, edits go through Supabase Studio. Cam
keeps the **source of truth** in `client-dict.md`; ad-hoc Studio edits
should be back-filled to the dictionary so a future re-import doesn't
wipe them.

### 4.4 Groups vs independents

A client is a **group** when `is_group = true`. Groups display
differently on the clients tab and on their detail page:

- **Clients tab** — group clients show a "Group" subtitle; independents show "Independent".
- **Client detail page** — group clients render offices in a 2-column grid (FTA has 10 offices; the grid halves the vertical space). Independents render single-column.

Active groups: **FTA**, **Sentinel/SAM RIA**. AdvisorMax was
dissolved — every former member is now an independent client. Arrive
Financial Services is the label for a 3rd group with no orders yet.

---

## 5. The order lifecycle

This is the core ops workflow. An "order" is one seminar campaign — a
mailer + (optionally) digital ads that drive attendance to one or two
events the same week.

### 5.1 Lifecycle at a glance

```
Pending Details   →   All Details Added   →   Proof Sent to Client
                                                       │
                              ┌────────────────────────┘
                              ↓
                  Awaiting Your Approval ──→ Order Sent ──→ (seminars happen)
                          │
                          ↓
                 Revision Requested ──→ (new proof) ──→ Awaiting Your Approval
```

The dashboard surfaces this via the `display_status` column on the
`orders_with_display_status` view. The view picks status in this
priority order:

1. Pending proof exists → `Awaiting Your Approval`
2. Revision-requested proof exists → `Revision Requested`
3. `dm_status` (raw from DM sheet)
4. `digital_status` (raw from Digital Jobs sheet)
5. Fallback → `Submitted`

### 5.2 Creating an order

**Client side** (`/orders/new`):

1. Sign in as the client.
2. Click **+ New order** on `/orders`.
3. Fill in the form: event date(s), venue, class type, DM checkbox, Digital checkbox.
4. The form supports **venue quick-fill** from order history (commit `f5b7d03`) — pick a prior venue to skip the address re-entry.
5. Submit.

**Admin side** — no `/admin/orders/new` yet. For now, admin order
creation requires Supabase Studio or working through the client UI as
that client. Tracked in `docs/TODO.md`.

### 5.3 Order Sent Deadline (the date that matters)

**Rule:** the mailer must be in mailboxes **2 weeks before the event**.
Printing + addressing + drop takes **5–8 days**. So production must
start on the **Monday 4 weeks before the event**.

This date is the `order_sent_deadline` column and shows up as the
**"Order Sent Deadline"** column on the orders table (Upcoming tab only;
hidden on Past since by definition the deadline is behind us).

| Event date | Order Sent Deadline (production must start) |
|---|---|
| Tue Jul 14, 2026 | Mon Jun 15, 2026 |
| Tue Aug 4, 2026  | Mon Jul 6, 2026  |

### 5.4 Status fields — DM vs Digital

| Status field | Source | Example values |
|---|---|---|
| `dm_status` | Direct Mail sheet → import | `Pending Details`, `All Details Added`, `Proof Sent to Client`, `Order Sent` |
| `digital_status` | Digital Jobs sheet → import | `Campaign Completed`, `Pending Details`, etc. |
| `main_status` | (ignored — see migration 011) | — |
| `display_status` | Computed by `orders_with_display_status` | see §5.1 priority |

### 5.5 Tabs: Upcoming vs Past

The orders table (on `/admin`, `/admin/orders`, `/admin/clients/<id>`,
and `/orders`) splits into two tabs:

| Tab | Rule |
|---|---|
| **Upcoming** | `event_1_date >= today` AND `dm_status` doesn't contain "order sent" |
| **Past events** | `event_1_date < today` (strictly) |
| _Hidden_ | `event_1_date >= today` AND `dm_status` = Order Sent — the mail is out, just waiting for the date |

Digital-only orders (`needs_direct_mail = false`) **never appear in
either tab** — they're not "events" in the production sense. They show
up on per-client team pages and elsewhere with their `DIG-NNN`
identifier instead of `#NNN`.

---

## 6. Proof workflow

### 6.1 Uploading a proof (admin)

1. Open the order detail page: `/admin/orders/<number-or-DIG-NNN>`.
2. Click **Upload proof** in the top-right of the header.
3. You land at `/admin/proofs/<order-uuid>/upload`.
4. Pick the PDF from disk + click **Upload**.
5. The browser PUTs straight to Supabase Storage via a signed upload URL
   (no Vercel function in the path, so 6–20 MB PDFs work fine).
6. The page redirects back to the order detail, and the new proof row
   appears with status **pending**.

> Storage path convention: `proofs/<client_id>/<order_number>/<version>.pdf`.
> The integer `order_number` is used here (not `display_ref`) so existing
> PDFs in storage stay reachable.

### 6.2 Client approval / revision

1. Client signs in and opens the order: `/orders/<number-or-DIG-NNN>`.
2. They see the latest proof with **View PDF**, **Approve**, **Request revision** buttons.
3. **View PDF** opens a 10-minute signed URL — secure but throwaway.
4. **Approve** → proof status becomes `approved`, order's `display_status` no longer says "Awaiting Your Approval".
5. **Request revision** → opens a textarea, requires a comment, then sets the proof to `revision_requested` and surfaces the comment.
6. After a revision: upload a new proof (§6.1) — the previous version stays in history.

### 6.3 Where proof history lives

Each order detail page has a **Proofs** section listing every version
with its status pill, the client's revision comment (if any), and a
**View** link. Below it, the **History** section logs every event
(import, proof upload, status change) via the `order_events` table.

---

## 7. Invoicing

### 7.1 Invoice list (`/admin/invoices`)

Admin-only page. Each row shows: Order link · Status pill · Sent date ·
Paid date · DM total · Digital · **Total → links to detail**.

### 7.2 Per-invoice detail (`/admin/invoices/<id>`)

Click the Total cell in the list to land here. Four cards:

- **Dates** — sent, paid
- **Line items** — DM rate, DM total, Digital, Tech / sequences
- **Fees** — CC processing, FL state tax
- **Total** — single big number

This view surfaces every column in the `invoices` table; the list page
only summarizes the headline totals.

### 7.3 Creating / editing invoices

Not in-app yet. Today invoices are created in Supabase Studio (or by
the import script when source data includes them).

---

## 8. Finding orders (filters and search)

### 8.1 `/admin` Overview

The fastest path. Shows tiles (Clients / Orders / Pending proofs /
Invoices) and the tabbed orders table. The tile **Orders** is filtered
to `needs_direct_mail = true` so the count matches what the tabs show
(digital-only orders are excluded).

The sidebar's **Past events** item deep-links to `/admin?tab=past`.

### 8.2 `/admin/orders` global filter

For complex queries. The filter row supports:

| Filter | Examples |
|---|---|
| **Client** | All / FTA / Sentinel/SAM RIA / Bone Asset Management / … |
| **Class** | All / R101 / W101 / SS101 / WAT / R90 / Taxes |
| **Type** | All / Direct mail / Digital |
| **Status** | Populated from distinct `display_status` values currently in the data |
| **From** | Inclusive `event_1_date` floor (YYYY-MM-DD) |
| **To** | Inclusive `event_1_date` ceiling |
| **Search** | ilike across `job_name`, `market`, `advisor_name` |

All filters compose. State lives entirely in the URL (the form uses
`method="get"`), so you can bookmark or share a filtered view.

**Clear filters** wipes all 7 params with one click.

### 8.3 Per-client view

`/admin/clients/<id>` shows the full client profile, offices, team,
**plus** the same tabbed orders table scoped to that client. URL
convention `/admin/clients/<id>?tab=past` works.

---

## 9. URL cheat-sheet

| Surface | Admin URL | Client URL |
|---|---|---|
| Sign-in | `/login` | `/login` |
| Auth callback | `/callback` | `/callback` |
| Overview / Home | `/admin` | `/orders` |
| Past events | `/admin?tab=past` | `/orders?tab=past` |
| Clients list | `/admin/clients` | — |
| Client detail | `/admin/clients/<id>` | — (their own at `/account`) |
| Orders (global filter) | `/admin/orders` | `/orders` (scoped by RLS) |
| Order detail | `/admin/orders/<n-or-DIG-NNN>` | `/orders/<n-or-DIG-NNN>` |
| New order | _no admin route yet_ | `/orders/new` |
| Invoices list | `/admin/invoices` | — |
| Invoice detail | `/admin/invoices/<id>` | — |
| Proofs upload | `/admin/proofs/<order-uuid>/upload` | — |
| Users | `/admin/profiles` | — |
| Venues | — | `/venues` |
| Account | — | `/account` |

---

## 10. Glossary

> Full version: [`memory/glossary.md`](../memory/glossary.md).

| Term | Meaning |
|---|---|
| **DM** | Direct Mail — physical mailer driving seminar attendance |
| **Order #NNN** | Real DM order from the DM sheet (range #651–#967) |
| **DIG-NNN** | Synthetic display ref for a digital-only order |
| **Order Sent Deadline** | Monday 4 weeks before the event — production start |
| **R101 / R90** | Retirement 101 / Retirement 90 seminars |
| **W101** | Women's Retirement 101 |
| **SS101** | Social Security 101 |
| **WAT** | Wills & Trusts seminar |
| **FTA** | Financial & Tax Architects (largest group client) |
| **Sentinel / SAM RIA** | Sentinel Asset Management LLC (group client) |
| **AdvisorMax** | Former group, now dissolved per ops direction |
| **FMO** | Field Marketing Organization (insurance distribution) |
| **RIA** | Registered Investment Advisor |
| **PSR** | _Not used here_ — leftover from a generic template |

---

## 11. Data sources (for reference)

The system loads from three Google Sheet exports, all checked into
`scripts/.import-work/`:

| Source | File | What it has |
|---|---|---|
| **Direct Mail Sheet** | `direct-mail.csv` | 207 DM orders, statuses, deadlines, venues |
| **Digital Jobs Sheet** | `digital-jobs.md` | 118 digital-only campaigns |
| **Client Dictionary** | `client-dict.md` | Business / defaults / pricing per client (two concatenated tables) |

The **Main Order Sheet is intentionally ignored** — it's admin
bookkeeping that lags the real workflow.

### 11.1 Re-importing

When the source sheets change materially:

```bash
npx tsx --env-file=.env.local scripts/import-v2.ts
```

This wipes `order_events / proofs / invoices / orders / rooms / buildings
/ venues / offices / clients`, re-inserts from the two source files, and
then auto-runs the two backfill scripts (offices contact fields + client
business fields). `auth.users` + `public.profiles` are preserved across
the wipe.

Demo profiles need their `client_id` re-linked after a re-import — the
UUIDs change. See [`lib/actions/demo.ts`](../lib/actions/demo.ts) for
the `FTA_CLIENT_ID` constant that needs updating.

---

## 12. Where to look when something breaks

| Symptom | First step |
|---|---|
| User can't sign in | [`RUNBOOK.md` § "A client says they can't log in"](RUNBOOK.md) |
| Client A sees Client B's data | [`RUNBOOK.md` § "Client A can see Client B's order"](RUNBOOK.md) — run `npm run verify:rls` |
| Invite emails not arriving | Check Supabase auth dashboard; verify `rate_limit_email_sent` and SMTP config |
| Order count looks off | Check the tile vs tab logic — the Overview Orders tile is `needs_direct_mail = true` only; tabs additionally filter Past/Upcoming by `event_1_date` |
| `display_status` looks wrong | See the priority in §5.1 — pending proof beats `dm_status` |

---

## 13. Conventions

| Convention | Where it's enforced |
|---|---|
| One data layer (no raw `.from()` in pages/components) | Operating principle #3; closed by R001 |
| Server Components by default; client islands only where needed | Codebase pattern; see `'use client'` directives |
| Migrations are append-only — never edit an applied migration | Project convention |
| Every shipped task gets a retrospective at `docs/tasks/Txxx-*.md` | Cam's preference |
| Commit each task as its own commit with a small-ADR body | Cam's preference |
| Don't bypass safety hooks (`--no-verify`, disabling RLS) | Hard rule |

---

## 14. Where to go next

- [`README.md`](../README.md) — engineering quick-start (install + run locally)
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — system architecture
- [`docs/AUTH.md`](AUTH.md) — auth flow details
- [`docs/DATA_MODEL.md`](DATA_MODEL.md) — schema and entity relationships
- [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) — Vercel + Supabase deployment
- [`docs/RUNBOOK.md`](RUNBOOK.md) — incident response
- [`docs/decisions/`](decisions/) — ADRs (why the system looks this way)
- [`docs/tasks/README.md`](tasks/README.md) — full task retrospective archive
- [`tasks/INDEX.md`](../tasks/INDEX.md) — multi-agent dispatch board
- [`TASKS.md`](../TASKS.md) — the human-facing TODO list
