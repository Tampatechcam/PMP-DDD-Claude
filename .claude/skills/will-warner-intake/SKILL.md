---
name: will-warner-intake
description: >-
  Process William Warner's (a.k.a. Sentinel / SAM RIA) seminar-event spreadsheet
  and turn each new event row into a PMP order — pulling defaults from the
  William Warner client profile (rate, qty, discount, class type, mailer type)
  and de-duping against orders that already exist in Supabase. Triggers when:
  the user drops a file from William Warner, Will Warner, Sentinel, SAM RIA, or
  mentions a Will Warner spreadsheet, seminar list, or class schedule. Also
  triggers on phrases like "load Will's new dates", "ingest Sentinel events",
  "import next batch from William", or any time the user wants to bulk-create
  orders for client_id `2765a9ec-c592-4707-b495-ad2b8d4e4897`. Use even when
  the user doesn't say the word "spreadsheet" — if a CSV/XLSX comes in and the
  layout matches (col A = date(s), B = venue, C = address, D = room), apply
  this skill.
---

# William Warner intake

Turn William Warner's class-schedule spreadsheet into PMP orders in Supabase.

## The file you're parsing

William sends an Excel/CSV with this exact column layout:

| Col | What it holds                                                                 |
|-----|-------------------------------------------------------------------------------|
| A   | **Both class dates** for one seminar pair, in some shorthand form             |
| B   | Venue name                                                                    |
| C   | Venue street address                                                          |
| D   | Room / classroom                                                              |

There may be a header row above the data. Skip blank rows.

### Column A — the dates are paired

Each row represents **one seminar pair** (two events two days apart, e.g. Mon+Wed). William writes both dates in a single cell using any of these forms — be flexible:

- `Jun 16 + Jun 18` · `6/16 & 6/18` · `6/16, 6/18` · `Mon 6/16 / Wed 6/18`
- `June 16-18` (means the 16th and 18th, NOT a range)
- `6.16.26 / 6.18.26` — sometimes with year
- Sometimes only one date is given — assume the second event is **48 hours later** unless told otherwise

Parse to two ISO dates: `event_1_date` (earlier) and `event_2_date` (later). If the year isn't in the cell, infer from context (the file is usually for the next 1–3 months; never pick a date in the past).

### Skip "red" / "not available" rows

In Excel, William marks unavailable rows in **red text or red fill**. CSV export loses color, so look for these textual markers and **skip the row** if any apply:

- `red` written anywhere in the row (he sometimes notes it in a comment)
- `N/A`, `n/a`, `not available`, `unavailable`, `closed`, `cancelled`
- `TBD`, `TBA`, `tentative` in the date or venue column
- Venue or address blank with no obvious recovery

If you have access to the original `.xlsx`, prefer reading it with a library that surfaces cell color (e.g. `openpyxl`) — then skip cells with red font (`color.rgb` starts with `FF` and red dominates) or red fill (`fill.fgColor`).

## Don't re-create orders that already exist

Before INSERTing, query existing orders for William Warner and dedupe:

```sql
SELECT id, event_1_date, event_2_date, venue_text, office_id
FROM public.orders
WHERE client_id = '2765a9ec-c592-4707-b495-ad2b8d4e4897'
ORDER BY event_1_date DESC NULLS LAST;
```

A row is a duplicate if **event_1_date matches** AND (`venue_text` matches OR `event_2_date` matches). The latest already-logged order's `event_1_date` is a useful watermark — anything earlier than that is almost certainly already in the system.

Report to the user how many rows were already logged vs. new.

## Append the rest from the client profile

After parsing the four columns, fill in the per-order fields that aren't in the spreadsheet by reading the William Warner client profile and the office for the state on the address:

| Field                  | Source                                                                |
|------------------------|-----------------------------------------------------------------------|
| `client_id`            | Fixed: `2765a9ec-c592-4707-b495-ad2b8d4e4897` (William Warner)        |
| `office_id`            | Match on the state in column C's address (CT/MD/PA → one of the 3 offices below) |
| `advisor_name`         | `William Warner` (or the office's `advisor_names` if set)             |
| `class_type`           | `R101` (from `clients.default_class_type`)                            |
| `mailing_quantity`     | `9000` (from `clients.default_mailing_quantity`)                      |
| `mailer_type`          | `New FTA R101` (from `clients.default_mailer_type`)                   |
| `needs_direct_mail`    | `true`                                                                |
| `dm_status`            | `'Pending Details'`                                                   |
| `first_class_day`      | Calculate: **2 weeks before `event_1_date`**                          |
| `order_sent_deadline`  | Calculate: Monday **4 weeks before** `event_1_date`                   |
| `venue_text`           | Column B (and optionally append " • Room " + column D)                |
| `venue_address_text`   | Column C                                                              |
| `event_1_room`         | Column D                                                              |

### Sentinel offices (for state → office_id lookup)

| State | office_id                                       | Name                  |
|-------|-------------------------------------------------|-----------------------|
| CT    | `244e343f-5803-4798-b57c-fd1231fc2d69`          | William Warner - CT   |
| MD    | `7c9eb30f-3b49-49d3-8c45-aec7154f4089`          | William Warner - MD   |
| PA    | `28247e13-ed89-4616-85a6-ec00b9e7008a`          | William Warner - PA   |

If the address has none of those state codes, leave `office_id` NULL and surface it to the user for manual picking.

## Workflow

1. **Read the file** (CSV or XLSX). For XLSX, prefer `openpyxl` so you can see red cells.
2. **Build a list of candidate rows**: parse column A into `(event_1_date, event_2_date)`, attach B/C/D, drop the red/N-A rows. Sort by `event_1_date` ascending.
3. **Query existing William Warner orders** (SQL above). Compute the dedup set.
4. **Filter candidates** to those NOT in the dedup set. Report counts: `N rows total · X already logged · Y new · Z skipped (red/unavailable)`.
5. **Build a preview**: show the user a table of the Y new rows with all derived fields filled in (event dates, venue, office, calculated deadlines). Mark any row that's missing an office_id.
6. **Wait for explicit approval** — do NOT INSERT until the user OKs the preview. Use the same approval gate the PMP intake tab uses ("Approve & create" button).
7. **On approval**, INSERT each row into `public.orders`. Assign the next available `order_number` (`SELECT coalesce(max(order_number), 0) + 1`).
8. **Report** the new order numbers back with deep links into the artifact's order detail view.

## Why this skill exists

William sends this same-format file roughly every month with the next batch of seminar pairs. Doing intake by hand means typing the same client/office/rate/qty/mailer values 5–20 times per file. This skill exists so the operator only has to confirm the dates and venue, and everything else flows from the client profile.

## Open issues / things to refine

- If William ever adds a digital-only seminar to this sheet, this skill will mis-process it (it assumes DM). Watch for rows where the venue is blank but a digital budget is mentioned in a notes column.
- Column A's date format is informal — if you hit a row you can't parse confidently, surface it for manual entry rather than guessing.
- The "red row" detection from CSV is imperfect (no color info survives export). When possible, get the `.xlsx` directly.
