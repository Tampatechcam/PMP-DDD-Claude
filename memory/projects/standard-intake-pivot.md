# Standard Intake Pivot — June 2026

**Status:** Shipped on `feature/standard-intake`, merged to `main` 2026-06-13.
**Trigger:** Per-client CSV mappers (Will Warner, FTA, etc.) were turning into a maintenance tax. Every new client meant a new parser. Replace with one standardized template every client uses.

## What changed

### 1. Standard intake template (replaces per-client CSV mappers)

- **Template:** `public/templates/standard-intake.csv` — downloadable, columns are stable across clients.
- **Schema:** `lib/intake/schema.ts` — Zod, ISO date format `YYYY-MM-DD`, 24-hour times.
- **Parser:** `lib/intake/parse.ts` — quoted fields, CRLF, escapes.
- **Server actions:** `lib/actions/intake.ts` — `previewIntakeCsv()` validates each row, `commitIntakeCsv()` resolves `client_name`/`office_name` to IDs, allocates next `order_number`, inserts in one shot, logs each row to `audit_log` with `source='admin-bulk-intake'`.
- **UI:** `/admin/intake` — 3 cards (download template, upload form, column reference). `IntakeForm.tsx` is the client island with file picker → validate → preview list (valid/invalid) → commit.

### 2. Audit log — write trail for every admin action

- **Table:** `public.audit_log` (id, table_name, row_id, action [INSERT|UPDATE|DELETE], source, actor_email, before_data, after_data, at). RLS: admin-only read.
- **Helper:** `lib/db/audit.ts` exports `recordAudit({table_name, row_id, action, source, before_data, after_data})`. Uses service-role admin client so writes never get RLS'd out.
- **UI:** `/admin/audit` — viewer with filters (source, table, action, actor) and per-row expandable JSON before/after diffs. Backed by `lib/db/audit-query.ts`.
- **Sources in use:**
  - `admin-bulk-intake` — CSV intake commits
  - `admin-status-edit` — order status changes via `lib/actions/orders.ts:updateOrderStatus`
  - `admin-delete` — single order delete via `deleteOrder`
  - `admin-bulk-delete` — multi-select delete via `bulkDeleteOrders`
  - `admin-invoice-void` — invoice void via `lib/actions/invoices.ts:voidInvoice`
  - `client-proof-decision` — client approving/rejecting a proof via `lib/actions/proofs.ts:decideProof`

### 3. Venues normalized — 3-level cascade in order form

- **New tables:** `public.buildings (id, venue_id FK, name)`, `public.rooms (id, building_id FK, name, capacity)`. `venues` gained `office_id` so a venue belongs to a specific office.
- **Back-populated:** 209 venues, 73 buildings, 92 rooms parsed from existing `venue_text` patterns like `"Venue • Building • Room"` across the order history.
- **Loader:** `lib/db/venue-cascade.ts:loadVenueCascade()` returns `{venues, buildings, rooms}` in a single round-trip.
- **Form:** `/admin/orders/new` — Office Select → Venue Select (filtered to office) → Building Select (filtered to venue) → Room Select (filtered to building). Hidden inputs persist `venue_id`/`building_id`/`room_id`/`venue_text`/`venue_address_text`. **Removed** the free-text venue inputs and the "Fill from past order" select.

### 4. Office defaults — pre-fill from history

- **Office columns added:** `default_class_type`, `default_mailing_quantity`, `default_mailer_type`, `default_start_time`, `default_end_time`, `default_charity`, `default_needs_dm`, `default_needs_digital`, `default_needs_sheet`.
- **Back-populated** via mode aggregation across each office's order history.
- **Behavior:** `AdminOrderForm` pre-fills these once per office change (state: `defaultsAppliedFor`). User can still override.
- **Order form drops:** `job_name` (server-generates from `order_number`), explicit charity field (now from office default), default event count = 2 (Mon+Wed pattern).

### 5. AI summaries moved server-side

- **Route:** `app/api/ai/summary/route.ts` — POST `{kind: 'upcoming' | 'deadlines' | 'revenue'}`.
- **Model:** `claude-haiku-4-5-20251001` via `@anthropic-ai/sdk`.
- **Requires:** `ANTHROPIC_API_KEY` in `.env.local` (also Netlify env vars).
- **Why:** Cowork artifact was making client-side AI calls. Moving to server route keeps the API key out of the artifact and makes the same summaries available to production `/admin`.

## Migrations applied (Supabase project `amtunktskgwvvqumrbde`)

- `create_audit_log_table` — table + RLS policies + indices
- `20260613000001_buildings_rooms_office_defaults.sql` — buildings, rooms, office defaults columns, back-population SQL

## Cowork artifact role (changed)

The Cowork artifact (`pmp-ops-command-center.html`) is now **read-only / ops monitoring**:
- Order list view, deadlines, AI summaries.
- All writes (status edits, deletes, intake, etc.) live in `/admin` so they get audit logging and the cascade UI.

## Skills added

- `.claude/skills/will-warner-intake/SKILL.md` — kept as a reference for Will Warner's historical CSV format, but the standard template should be used going forward.
- `.claude/skills/supabase-postgres-best-practices/` — added as untracked skill bundle.

## Deployment

- **Netlify** (not Vercel). `netlify.toml` wired. `main` branch is deploy target.
- After merge: push to `origin/main` → Netlify auto-build.

## Dependencies added

- `zod ^3.23.8` — intake schema validation
- `@anthropic-ai/sdk ^0.27.0` — AI summary route

Run `npm install` post-pull to refresh lockfile.

## Open work

- TypeScript check / lint not yet run on the merged state — verify with `npm run typecheck` and `npm run lint` in a follow-up.
- `ANTHROPIC_API_KEY` needs to be set in Netlify env for the AI route in prod.
- User mentioned wanting to remove more "unused fields" from the order form (sending list folder URL, QR code link, market, time notes) — not yet done; would be a small follow-up commit.

## Files touched (high-level)

```
NEW
  public/templates/standard-intake.csv
  lib/intake/{schema,parse}.ts
  lib/actions/intake.ts
  lib/db/{audit-query,venue-cascade}.ts
  app/admin/intake/{page,IntakeForm}.tsx
  app/admin/audit/page.tsx
  app/api/ai/summary/route.ts
  supabase/migrations/20260613000001_buildings_rooms_office_defaults.sql
  .claude/skills/will-warner-intake/SKILL.md
  memory/projects/standard-intake-pivot.md  (this file)

MODIFIED
  components/admin/AdminOrderForm.tsx    — cascade dropdowns, office defaults, drop job_name
  components/layout/AdminSidebar.tsx     — Intake + Audit log nav items
  lib/db/offices.ts                      — select default_* columns
  lib/actions/orders.ts                  — recordAudit on status/delete/bulk-delete
  lib/actions/invoices.ts                — recordAudit on void
  lib/actions/proofs.ts                  — recordAudit on client decision
  app/admin/orders/new/page.tsx          — loadVenueCascade, pass to form
  package.json                           — zod, @anthropic-ai/sdk
```
