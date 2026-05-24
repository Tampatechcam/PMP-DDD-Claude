# Cam Hebeler

**Role:** Builder + sole human owner of the PMP Dashboard project.
**Email:** camhebeler@gmail.com

## Working style

- Moves fast; prefers execution over clarification when next step is obvious
- Frequently runs Claude with parallel agents on non-overlapping scope
- Iterates by terse instruction + screenshots — read screenshots carefully
- Test-via-screenshot, not test-via-unit-test
- Prefers MD docs as the source of truth for design + status

## Decisions made

- **AdvisorMax dissolved** — was a group, now every member is independent (see [T008](../../docs/tasks/T008-dissolve-advisormax.md))
- **Andy Urso is his own client** — with `business_name = "Andy Urso"`
- **Past tab strictly = past event_1_date** — never `dm_status = "Order Sent"` alone (see [T001](../../docs/tasks/T001-past-tab-strict-date.md))
- **Digital orders use `DIG-NNN`** — synthetic order numbers from the importer should be visible as such (see [T003](../../docs/tasks/T003-dig-display-ref.md))
- **`/callback` is the right auth URL** — not `/auth/callback`. Code fix shipped (T012), docs synced (R005).
