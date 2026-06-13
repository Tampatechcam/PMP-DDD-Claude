# 0005 — Direct-to-Storage upload for proof PDFs

**Status:** Accepted · 2026-05-23

## Context

Proof PDFs are 6–20 MB. Server Actions cap at 1 MB by default, and even
raising the limit means streaming 20 MB through a Vercel function — slow,
expensive, and at risk of the 60-second timeout on hobby plans.

## Decision

The browser uploads PDFs straight to Supabase Storage using a signed
upload URL. The Server Action only:

1. Authorizes (admin only).
2. Generates the signed URL for
   `proofs/{client_id}/{order_number}/{version}.pdf`.
3. After the browser finishes the PUT, inserts the `proofs` row and an
   `order_events` audit row.

Storage RLS still applies — even with a signed URL, the path must be under
a `client_id` folder the policy allows, and `bucket_id = 'proofs'`. Only
admin policies cover writes; clients can read but not upload.

## Consequences

- Upload speed is bounded by the user's network and Supabase Storage, not
  by a Vercel function timeout.
- The flow has two round-trips (signed URL → upload → confirm). The Action
  that confirms must tolerate the browser dying mid-upload; we treat the
  presence of a `proofs` row as the source of truth, not the presence of
  the file alone.
- Download is identical in reverse: a Server Action mints a short-lived
  signed download URL (~10 minutes) for clients.

## Alternatives considered

- **Stream through Server Action.** Rejected — body size + cold start +
  timeout = brittle.
- **Skip Storage, embed PDFs in Postgres bytea.** Rejected — slow, bloats
  the DB, breaks every backup tool.
