---
name: pmp-pricing
description: >-
  Power Mailers Plus pricing model — how to price/quote/invoice a client's
  direct-mail + digital order. Use when generating an invoice, building a quote,
  estimating an order's cost, sanity-checking an amount, reconciling a client
  name across the sheets/Stripe/DB, or answering "what does X cost / what's
  client Y's rate / do they get the discount / do they pay the CC fee / is it
  taxed". Covers per-client DM per-piece rates, direct-mail discounts, digital
  budgets, tech/sequence add-on fees, the card-processing fee, and FL sales tax.
---

# PMP Pricing Model

Built from the **Official Invoice Sheet - PMP** (Google Sheet, 189 invoiced
orders) cross-referenced with the Supabase `clients`/`orders` tables and the
order sheet. An order bills up to three channels — **Direct Mail**, **Digital**,
**Tech/Sequences** — plus (some clients) a **card-processing fee** and (FL only)
**sales tax**. Implementation: [lib/invoices/compute.ts](../../../lib/invoices/compute.ts).

## The formula

```
DM gross    = invoiced rate ($/piece)  ×  mailing_quantity
DM discount = DM gross × client discount %          (DM line only)
DM net      = DM gross − DM discount
subtotal    = DM net + digital + tech/sequences
card fee    = 3% × subtotal   — ONLY for clients who pay by card (see table)
FL tax      = 7% × DM net     — ONLY when the order's office is in FL
TOTAL       = subtotal + card fee + FL tax
```

Verified examples (from the sheet): Scout #654 — $0.70×7,000=$4,900, −5%=**$4,655** DM ·
Bone #656 — $0.77×7,000=$5,390 −5%=**$5,120.50** · FTA #651 — $0.75×6,500 −6%=**$4,582.50**.

## ⚠️ Three rules the current code gets wrong — fix before relying on it

1. **Card fee is per-client, NOT universal.** The sheet charges CC processing
   only for some clients (card payers) and never for others (ACH/check). Our
   `generateInvoice` adds 3% to *everyone*. **Add a per-client `charges_cc`
   flag** and gate the CC line on it. Charged: SAM RIA MD, Eagle, McGuire.
   Never: FTA, Bone, Scout, Kelly, O'Toole, Advisormax, Advanced Wealth.
2. **Rate varies by mailer/market within a client** — there is no single
   per-client rate. Pick the rate per order (see ranges below); the client
   `default_mailer_rate` is only a starting hint.
3. **FTA default rate in the DB is `0.077` — a typo for `0.77`.** Confirmed by
   the user and the sheet (FTA bills $0.75–$0.77). Fix the `clients` row.

## Per-client pricing profiles [from 189 invoiced orders]

| Client (group) | DM rate(s) $/pc | DM disc | Qty | Digital | Tech | Card fee? | FL tax? |
|---|---|---|---|---|---|---|---|
| **FTA** (Financial & Tax Architects) | 0.75–0.77 | **6%** | 5k–8k | — | $100 (phone reg) | **No** | No |
| **Sentinel / Will Warner — SAM RIA CT** | 0.55–0.62 | 5% | 7k–9k | $1,700 | $180 (teledirect) | sometimes | No |
| **Sentinel / Will Warner — SAM RIA MD** | 0.62–0.66 | 5% | 6k | $1,000 | $180 | **Yes** | No |
| **Bone Asset Management** | 0.77 | 5% | 7k | $1,750–$2,750 | $100–$200 | No | No |
| **Andy Urso** ("Advisormax") | 0.57–0.75 | 5% | 7k–10k | $840–$4,500 | $200–$250 | No | No |
| **Scout Financial Group** | 0.70–0.77 | 5% | 7k | $840 | $100–$200 | No | No |
| **Eagle Financial Solutions** | 0.77 | 5% | 7k | $840 | $250 (lead nurture) | **Yes** | No |
| **McGuire Insurance & Retirement** | 0.77 | 5% | 6k | $1,700 | $250 | **Yes** | No |
| **Copper Partners II / Kelly Capital** | 0.75 | 5% | 5k | $3,000 | $300 | No | No |
| **The O'Toole Group** | 0.81 | **none** | 6k | — | $180 | No | **Yes** (FL) |
| **Advanced Wealth Management** | 0.66 | 5% | 7k | $840 | $300 | No | No |
| Michael Foguth | ~0.58 | none | 10k | — | — | ? | No |
| Professional Group | ~0.81 | none | — | — | — | ? | No |

Defaults: discount is **5%** for most, **6% FTA**, **none** for O'Toole / Foguth /
Professional Group / Kelly's DB row. Quantities 5,000–10,000. ~24 of 40 clients
have no orders/pricing yet — quote at order time.

## Name reconciliation (sheet ↔ Stripe ↔ DB) [make these connections]

The invoice sheet's **Group Name** is messy; normalize to the DB client:

| Sheet label(s) | DB client / Stripe customer |
|---|---|
| `FTA` (+ advisor → office: FTA STL/CHI/NSV/TX/STL SS) | Financial & Tax Architects (group) |
| `SAM RIA CT`, `SAM-RIA CT`, `SAM RIA MD`, `SAM-RIA MD` | Sentinel/SAM RIA — William Warner (group), split by state office |
| `Bone Asset`, `Bone Asset Management` | Bone Asset Management |
| `The Otoole Group`, `The O'Toole Group` | The O'Toole Group |
| `Scout Financial`, `Scout Financial Group` | Scout Financial Group |
| `Kelly Capital Partners` | Copper Partners II DBA Kelly Capital Partners |
| `Advisormax` | Andy Urso (group dissolved → independent) |

When invoicing, the **Stripe Customer name = the DB client `name`** (canonical),
not the sheet label. Match orders by `Order Number`.

## Tech / sequence add-ons (flat fees) [DB + sheet]

Phone registration **$100** · Landing Page **$100** · Teledirect **$180/2 events** ·
Lead Nurture System **$250 or $300** (by client). Some Bone/Scout orders show $200.

## Digital

Billed as a fixed amount per order (the client's negotiated budget): seen at
$840 / $1,000 / $1,700 / $1,750 / $2,750 / $3,000 / $4,500. [CONFIRM whether
ad-spend vs. management fee is bundled — the sheet shows one number.]

## Seminar / class types

`R101` (Retirement 101) · `R90` · `W101` (Women's) · `SS101` (Social Security) ·
occasional Taxes / Estate / Dinner.

## Mailer types (the "what they buy") [from the order sheet]

Per-order mailer design (order sheet "Selected Mailer Design"; NOT yet in the DB
`orders` table — `mailer_type` is empty there):
`New FTA R101` (most common) · `FTA R101 - Multi Mailer` · `FTA Pillars - Taxes` ·
`FTA SS Mailer` · `Eagle R101 - Bi-Fold W/ Envelope` · `Quad-Fold - Green - Adaptations`
(O'Toole/Professional) · `Female College Redesign` / `PM - College Mailer Female`
(women's) · `Kelly Capital Mailer`. Rate tends to track the mailer/market — a
Multi-Mailer or larger market runs a different $/pc than a standard single.

## Non-profit clients

`is_non_profit = true`: **Sentinel / William Warner**, **Andy Urso**. (Affects
charity/return-address handling; no automatic price change observed in the sheet.)

## Sources to refresh this skill
- **Official Invoice Sheet - PMP** (Drive id `1QQ2P50nGUNKqMMHEcoaMPDQ4F6ltb4W8E3Il92b9WAI`) — the master pricing record, by order number.
- Order sheet `scripts/.import-work/direct-mail.csv` / Drive "Order Sheet" — mailer design + venue per order.
- Also: "FTA invoices Janet", "FTA INVOICES" (Drive) — FTA-specific.
