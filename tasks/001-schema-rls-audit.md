# TASK-001 — Schema + RLS Audit
**Status:** complete
**Owner:** agent-a
**Started:** 2026-05-24T07:49:06Z
**Completed:** 2026-05-24T07:55:00Z
**Scope:** Parts 4 and 5 of the implementation plan.
**Files touched:** none (read-only audit)

## Summary
The DB matches the plan very closely. All ten Part 4.1 tables, both Part 4.2 triggers, both Part 4.3/4.4 views, both Part 5.1 helpers, every Part 5.2 RLS policy, and both Part 5.3 storage policies are present on disk. The biggest deviation is that `orders_with_display_status` has been rewritten five times (008→012) and the *current* logic ignores `main_status` entirely and now only considers proof state, then `dm_status`, then `digital_status`, then `'Submitted'` — fundamentally different from the plan's case statement (which translated dm_status values into generic labels like "In Production"/"Ready to Send"/"Completed"). Two intentional additions also show up: `orders.display_ref` (012) and `offices.state` (013), both reasonable schema growth that the plan didn't anticipate. One real correctness fix (007) added `security_invoker = true` to both views — without it, the plan's views as written would have *bypassed RLS on PG15+*.

## Findings

### Schema (Part 4.1)
- [x] clients — `supabase/migrations/20260523000001_init_schema.sql:6-28` — all 21 plan columns present verbatim.
- [x] offices — `supabase/migrations/20260523000001_init_schema.sql:31-47` — plan columns present. `state text` added later in `20260523000013_office_state.sql:7-8` (additive, fine).
- [x] venues — `supabase/migrations/20260523000001_init_schema.sql:50-60` — all columns + `unique (client_id, name)` matches plan.
- [x] buildings — `supabase/migrations/20260523000001_init_schema.sql:62-66`.
- [x] rooms — `supabase/migrations/20260523000001_init_schema.sql:68-73`.
- [x] profiles — `supabase/migrations/20260523000001_init_schema.sql:76-82` — pk → auth.users, role check `in ('client','admin')`, default 'client'. Matches.
- [~] orders — `supabase/migrations/20260523000001_init_schema.sql:85-138` — all plan columns present, indexes on `(client_id, event_1_date desc)` and `(order_number)` present (lines 137-138). Drift: `display_ref text unique` was added in `20260523000012_display_ref.sql:13` (additive, with backfill at lines 18-26 to mint `DIG-001..DIG-NNN` for digital-only synthetic order_numbers). Not in plan, but well-justified by the migration comment.
- [x] proofs — `supabase/migrations/20260523000001_init_schema.sql:141-153` — status check `in ('pending','approved','revision_requested')`, unique `(order_id, version)` both match.
- [x] invoices — `supabase/migrations/20260523000001_init_schema.sql:156-170`.
- [x] order_events — `supabase/migrations/20260523000001_init_schema.sql:173-180`.

### Triggers (Part 4.2)
- [x] `set_updated_at()` + `orders_updated_at` BEFORE UPDATE — `supabase/migrations/20260523000002_triggers.sql:4-13`.
- [x] `handle_new_user()` (security definer) + `on_auth_user_created` AFTER INSERT on `auth.users` — `supabase/migrations/20260523000002_triggers.sql:17-27`. Plus a one-shot backfill of missing profiles in `20260523000007_view_rls_and_backfill.sql:53-56` (defensive, not in plan, fine).

### Views (Parts 4.3, 4.4)
- [~] `orders_with_display_status` — first created at `supabase/migrations/20260523000005_views.sql:6-23` matching the plan's case statement verbatim, then rewritten five times. **Current definition lives in `20260523000012_display_ref.sql:33-50`**.
  - **Current logic** (012): pending-proof → "Awaiting Your Approval"; revision-requested → "Revision Requested"; else `dm_status` (raw); else `digital_status` (raw); else `'Submitted'`. `main_status` is **completely ignored** as of migration 011.
  - **Plan's logic** (Part 4.3): dm_status = 'Order Sent' → "In Production"; dm_status = 'All Details Added' → "Ready to Send"; dm_status ilike '%complete%' OR main_status = 'Order Completed' → "Completed"; pending proof → "Awaiting Your Approval"; revision → "Revision Requested"; else `coalesce(main_status, 'Submitted')`.
  - **Drift call:** the current view surfaces raw operational sheet values (good for admin transparency); the plan's view translated them into a small, client-friendly vocabulary. Whether that matters depends on UI audience — the migration comments justify the move ("the ops team works off the DM Sheet… statuses").
  - Also note: `security_invoker = true` was missing in 005 and added in `20260523000007_view_rls_and_backfill.sql:14` — without it, on PG15+ the view runs as owner and **bypasses RLS** on the underlying `orders` table. The plan's SQL in Part 4.3 as written has this same bug.
- [x] `client_self_view` — created at `supabase/migrations/20260523000005_views.sql:28-42`, recreated with `security_invoker = true` at `20260523000007_view_rls_and_backfill.sql:33-48`. Columns match the plan exactly: id, name, business_name, business_website, ein, disclaimer, default_mailer_type, default_class_type, default_mailing_quantity, default_digital_budget, is_non_profit. (UI usage not audited per task scope.)

### RLS helpers (Part 5.1)
- [x] `current_client_id()` — `supabase/migrations/20260523000003_rls_helpers.sql:5-8`. `language sql stable security definer set search_path = public`, returns uuid.
- [x] `is_admin()` — `supabase/migrations/20260523000003_rls_helpers.sql:10-15`. Same modifiers; returns boolean.

### RLS policies (Part 5.2)
All ten `enable row level security` calls — `supabase/migrations/20260523000004_rls_policies.sql:4-13` (incl. `order_events` at line 13).
- [x] clients_select — `…004_rls_policies.sql:16-17`
- [x] clients_admin_write — `…004_rls_policies.sql:19-21`
- [x] offices_select — `…004_rls_policies.sql:24-25`
- [x] offices_admin_write — `…004_rls_policies.sql:27-29`
- [x] venues_select — `…004_rls_policies.sql:32-33`
- [x] venues_cud — `…004_rls_policies.sql:35-37`
- [x] buildings_all — `…004_rls_policies.sql:40-54`
- [x] rooms_all — `…004_rls_policies.sql:57-73`
- [x] profiles_select — `…004_rls_policies.sql:76-77`
- [x] profiles_update_self — `…004_rls_policies.sql:80-85` (with-check freezes `role`)
- [x] profiles_admin_write — `…004_rls_policies.sql:87-89`
- [x] orders_select — `…004_rls_policies.sql:92-93`
- [x] orders_insert — `…004_rls_policies.sql:95-96`
- [x] orders_update_admin — `…004_rls_policies.sql:99-101`
- [x] proofs_select — `…004_rls_policies.sql:104-111`
- [x] proofs_client_decide — `…004_rls_policies.sql:115-122` (with-check restricts to approved/revision_requested)
- [x] proofs_admin_write — `…004_rls_policies.sql:124-126`
- [x] invoices_admin_only — `…004_rls_policies.sql:129-131`
- [+] order_events_select / order_events_insert — `…004_rls_policies.sql:136-152` — **not in plan, added defensively**; plan only enabled RLS on the table without defining a policy (which would deny all). Implementation is sensible.

### Storage policies (Part 5.3)
- [x] `'proofs'` bucket created (private) — `supabase/migrations/20260523000006_storage.sql:5-7`.
- [x] `"proofs read own client"` SELECT — `supabase/migrations/20260523000006_storage.sql:10-15`, casts first folder segment to uuid.
- [x] `"proofs admin all"` ALL — `supabase/migrations/20260523000006_storage.sql:18-21`.

### Follow-up migrations (007–013)
- 007 `view_rls_and_backfill` — adds `security_invoker = true` to both views (fixes RLS-bypass) and backfills missing profiles for pre-trigger users. **Important correctness fix the plan itself missed.**
- 008 `dm_status_first` — rewrites display view to prefer `dm_status` raw, then `main_status` raw, then 'Submitted'. Drops the plan's translation table.
- 009 `prefer_main_status` — flips 008's priority: `main_status` first, `dm_status` fallback. (Comment says DM only ever holds "Order Sent".)
- 010 `prefer_workflow_status` — flips again: `dm_status` → `digital_status` → `main_status` → 'Submitted'. (Comment: main_status lags reality.)
- 011 `ignore_main_status` — drops `main_status` from the chain entirely: `dm_status` → `digital_status` → 'Submitted'.
- 012 `display_ref` — adds `orders.display_ref text unique` + index, backfills `DIG-001..DIG-NNN` for digital-only orders (where `needs_direct_mail = false and needs_digital = true`). Drops + recreates the display view so `display_ref` lands in the column order. **Schema additive, plan didn't anticipate synthetic digital order numbers.**
- 013 `office_state` — adds `offices.state text` + index. Denormalized region badge per office for admin UI. Additive, fine.

## Gaps (prioritized)

1. **No automated RLS verification** — impact: high. Why it matters: the plan's Part 17 DoD requires "RLS verified: client A cannot read client B's order by guessing UUID" and Part 11 lists `scripts/verify-rls.ts`, but that script doesn't exist in this repo. The 007 fix (missing `security_invoker`) is exactly the kind of bug an automated check would catch. Suggested fix: write `scripts/verify-rls.ts` that signs in as two seeded clients + an admin and asserts cross-tenant reads return 0 rows on every public table and on `storage.objects`.
2. **`orders_with_display_status` drifted far from the plan** — impact: medium. Why it matters: client UI will now see raw ops sheet values ("Pending Details, All Details Added") instead of the curated four-value vocabulary the plan promised. Either UI or the plan needs to update. Suggested fix: decide whether to (a) document the new behavior as the canonical contract in the plan + `docs/DATA_MODEL.md`, or (b) restore the translation layer for the client view while keeping raw status for admin.
3. **`order_events` policies not in the plan but exist in code** — impact: low. Why it matters: the plan enables RLS on the table without writing a policy, which would deny all access — the migration adds select + insert policies. The implementation is right; the plan is the gap. Suggested fix: backfill the plan / `docs/DATA_MODEL.md` so the policies are documented.
4. **No assertion that `security_invoker = true` stays on the views** — impact: medium. Why it matters: a future `create or replace view` without `with (security_invoker = true)` silently removes the option (Postgres treats it as defaulted off) and the RLS-bypass returns. Suggested fix: a comment in `views.sql` + a verify-rls.ts assertion that queries `pg_class.reloptions` for both views.
5. **Plan's published SQL is itself unsafe** — impact: medium (process). Why it matters: the plan in Part 4.3/4.4 omits `security_invoker`, so a fresh team following the plan as written would reintroduce the bug 007 fixed. Suggested fix: amend the plan markdown.

## Recommended next actions
1. Write `scripts/verify-rls.ts` — would be TASK-004: signed-in two-client + admin matrix asserting cross-tenant SELECT returns empty.
2. Decide canonical `display_status` contract (translated vs raw) — TASK-005: ADR in `docs/decisions/` + either UI update or view revert.
3. Update implementation plan Part 4.3/4.4 to include `with (security_invoker = true)` — TASK-006 (docs-only).
4. Add a pg_class.reloptions guard to verify-rls.ts so future view rewrites can't drop security_invoker silently — folds into TASK-004.

## Confidence
High on every file:line citation (every plan item maps to a concrete location, and the migration files are short and readable). The one thing that needs human eyes: whether the current raw `dm_status` / `digital_status` strings flowing through `orders_with_display_status` are what the client UI should show, or whether the plan's translated vocabulary is still the intent — that's a product decision, not a code one.
