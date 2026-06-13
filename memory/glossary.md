# Glossary

Full decoder ring for PMP Dashboard terminology. See [`CLAUDE.md`](../CLAUDE.md)
for the working-memory summary.

## Order / production terms

| Term | Meaning |
|---|---|
| **DM** | Direct Mail — physical mailer driving seminar attendance |
| **Digital** | Digital ad campaign (Facebook/Google) driving seminar attendance |
| **Order #NNN** | DM order from the Direct Mail sheet (range #651–#967 in current data, all real ops numbers) |
| **DIG-NNN** | Synthetic display ref for digital-only orders (no source order number; minted from `display_ref` column added in migration 012) |
| **Order Sent Deadline** | Monday 4 weeks before the event — production kicks off |
| **Client Approval Deadline** | When the client must sign off on the proof |
| **first_class_day** | Mail drop date (DB column; equals Order Sent Deadline in current data) |
| **event_1_date / event_2_date** | First and second seminar dates (advisors run each class twice the same week) |
| **Mailer Return Address** | Where bounced mail returns (per office, jsonb on `offices.mailer_return_address`) |

## Status taxonomy

| Status | Source | Tone |
|---|---|---|
| Pending Details | dm_status raw | neutral |
| All Details Added | dm_status raw | success |
| Proof Sent to Client | dm_status raw | warning |
| Awaiting Your Approval | computed by view (pending proof) | warning |
| Revision Requested | computed by view (revision proof) | danger |
| Order Sent | dm_status raw — mail has dropped | success |
| Campaign Completed | digital_status raw | neutral |
| Submitted | fallback when no other status | neutral |

The `orders_with_display_status` view picks: proof state → dm_status → digital_status → 'Submitted'. `main_status` is intentionally ignored (migration 011).

## Class types

| Type | Meaning |
|---|---|
| R101 | Retirement 101 |
| R90 | Retirement 90 (different format) |
| W101 | Women's Retirement 101 |
| SS101 | Social Security 101 |
| WAT | Wills & Trusts |
| Taxes | Tax-strategy seminar |
| WEALTH 101 | Wealth 101 |
| LEGACY PLAN | Legacy planning |

## Groups + abbreviations

| Term | Meaning |
|---|---|
| **FTA** | Financial & Tax Architects — flagship group, 7 advisor offices |
| **STL / NSV / CHI / TX** | FTA's regional advisor names: St. Louis / Nashville / Chicago / Texas |
| **STL SS** | FTA's "Senior Strategies" sub-office in St. Louis |
| **SAM RIA / Sentinel** | Sentinel Asset Management LLC — Will Warner's RIA |
| **AdvisorMax** | FMO (field marketing organization) affiliated with FTA. Was a group client, now dissolved per user direction; each member is independent. |
| **FMO** | Field Marketing Organization — insurance distribution intermediary |
| **RIA** | Registered Investment Advisor |

## Engineering shorthand

| Term | Meaning |
|---|---|
| **ADR** | Architecture Decision Record (`docs/decisions/000N-*.md`) |
| **DoD** | Definition of Done — Part 17 of the implementation plan |
| **RLS** | Row-Level Security (Supabase/Postgres) |
| **security_invoker** | Postgres view setting — runs view as caller, not owner. Required for views on RLS-gated tables on PG15+ |
| **PostgREST** | Supabase's auto-generated REST API on top of Postgres |
| **PAT** | Personal Access Token — Supabase management API auth |
| **(auth) / (client) / admin** | Next route groups + literal segment for admin (ADR 0007) |
| **Operating principle #3** | "One data-access layer: `lib/db/*.ts` server-side functions. No raw `supabase.from()` scattered in components." Closed by R001. |

## Multi-agent orchestrator shorthand

| Term | Meaning |
|---|---|
| **TASK-NNN** | Round-1 audit (agent-a/b/c) |
| **TASK-Rxxx** | Round-2 build task |
| **TASK-DSxxx** | Design-system audit task |
| **TASK-Vxxx** | Verify agent task |
| **claude** (owner) | Me — main session agent |
| **claude (orchestrator)** | Same model, different scope — owns security/RLS verification |
| **agent-a/b/c** | General-purpose Round-1 audit agents |

## Files frequently referenced

| Path | What |
|---|---|
| `scripts/.import-work/direct-mail.csv` | Source for all 207 DM orders |
| `scripts/.import-work/digital-jobs.md` | Source for all 118 digital-only orders |
| `scripts/.import-work/client-dict.md` | Client Dictionary — business/defaults/pricing per client |
| `scripts/import-v2.ts` | Wipe + re-import script; chains backfills |
| `scripts/backfill-office-fields.ts` | One-shot office state/phone/url/return-addr fill |
| `scripts/backfill-client-business.ts` | One-shot client business-fields fill |
| `scripts/consolidate-clients.ts` | Idempotent client-merge for duplicate digital-sheet rows |
| `scripts/verify-rls.ts` | RLS verification script (owned by orchestrator's R006/R007) |
