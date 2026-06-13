# T010 — Order links from admin pages stay in the admin shell

**Commit:** `d36ef6b` · `fix(admin): order links from admin pages stay in the admin shell`

## Problem

Clicking an order row in `/admin`, `/admin/orders`, or
`/admin/clients/<id>` used to bounce out to `/orders/<n>` — the
**client** shell with no sidebar — because `OrdersList` hard-coded
`/orders` as the order detail base path. From there, hitting "Orders"
in the client top nav landed on the public `/orders` page with
advisor-chip filters. Very confusing for an admin.

## Approach

`OrdersList` gained an optional `ordersBasePath` prop, plumbed through
to each Row's `orderHref()` call. Admin pages pass `'/admin/orders'`;
the client-facing `/orders` page omits it (the helper's
`basePath = '/orders'` default takes over via JS default-param
semantics — `orderHref(o, undefined)` resolves to `/orders/...`).

## Files

- [components/orders/OrdersList.tsx](../../components/orders/OrdersList.tsx) — new prop, threaded Props → Table → Row
- [app/admin/page.tsx](../../app/admin/page.tsx), [app/admin/orders/page.tsx](../../app/admin/orders/page.tsx), [app/admin/clients/[id]/page.tsx](../../app/admin/clients/[id]/page.tsx) — pass `ordersBasePath='/admin/orders'`

## Verification

- HTML fetch of `/admin` and `/admin/clients/<FTA-id>` confirms every order link now reads `/admin/orders/<number-or-DIG-NNN>`
- Typecheck clean
