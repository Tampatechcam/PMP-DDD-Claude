# Company / Context

## Power Mailers Plus (PMP)

The business this dashboard serves. PMP is a marketing service for
**financial advisors** running **retirement-planning seminars**. The
service has two main pieces:

- **Direct mail (DM):** Mailer designs printed and dropped to ZIP codes around each seminar venue
- **Digital ads:** Facebook + Google ad campaigns driving the same audience to the same seminar

Each "order" in the system = one seminar campaign (typically two events
the same week — first event and second event date).

## Customer types

### Group clients

Multi-advisor organizations with their own offices, advisors, and
internal "regions" or "advisor pods". Two in the current data:

| Group | Offices | Volume |
|---|---|---|
| **FTA** (Financial & Tax Architects) | 7 advisor offices (STL, CHI, NSV, TX, STL SS, David Jones, Justin Yoo) | ~173 orders |
| **Sentinel/SAM RIA** | Will Warner CT/MD/PA | ~45 orders |

### Independent firms

Solo or small RIAs each their own client. ~36 of them — Bone Asset
Management, Scout Financial Group, Eagle, Mason Street Wealth, McGuire,
Professional Group, etc.

### Dissolved / historical

- **AdvisorMax** — was a group label; per user direction, each member is now independent. Andy Urso is the only "AdvisorMax member" still aggregated (now as his own independent client).
- **Arrive Financial Services** — Group label exists, no orders in DB yet.

## Operational rhythm

1. Advisor (or PMP ops on behalf of advisor) creates an order with seminar dates + venue + class type
2. PMP designs the mailer + sets up the digital campaign ("Pending Details" → "All Details Added")
3. Client approves the proof ("Awaiting Your Approval" → approved or revision requested)
4. PMP drops the mailer ~2 weeks before the event ("Order Sent")
5. Mailer arrives 1 week before event — recipients RSVP via phone or landing page
6. Seminars happen (event_1_date, event_2_date)
7. PMP invoices the advisor; campaign closes ("Campaign Completed")

## Source sheets

- **Direct Mail Sheet** (Google Sheet) — 208 orders, exported to `direct-mail.csv`
- **Digital Jobs Sheet** (Google Sheet) — 118 campaigns, exported to `digital-jobs.md`
- **Client Dictionary** (Google Sheet) — business name, EIN, defaults, pricing per client; two concatenated tables with different column orders
- **Main Order Sheet** — IGNORED per user direction (admin bookkeeping; lags real workflow)

## Tools

- **Supabase Studio** — used by Cam for ad-hoc DB edits + auth template tweaks
- **Vercel** — production deploy target (when `main` branch exists)
- **Google Drive** — source of truth for the three sheets above; exports are checked into `scripts/.import-work/`
