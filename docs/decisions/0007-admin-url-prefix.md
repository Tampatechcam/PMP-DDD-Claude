# 0007 — Admin routes live under `/admin`, not a `(admin)` route group

**Status:** Accepted · 2026-05-23

## Context

Part 11 of the implementation plan sketches:

```
app/
  (client)/
    orders/page.tsx
    orders/[order_number]/page.tsx
  (admin)/
    orders/page.tsx
    orders/[order_number]/page.tsx
```

Next.js route groups (`(name)`) do **not** add a URL prefix. So both
`(client)/orders/page.tsx` and `(admin)/orders/page.tsx` resolve to
`/orders` and Next refuses to build:

```
Error: You cannot have two parallel pages that resolve to the same path.
```

Same conflict for `/orders/[order_number]`. The plan's structure can't
ship as-written.

## Decision

Drop the `(admin)` route group. Mount the admin app at `app/admin/*` so
URLs gain an explicit `/admin` prefix:

```
app/
  (auth)/login, callback        →  /login, /callback
  (client)/                      →  /, /orders, /venues, /account, …
    layout.tsx                   (signed-in clients, no URL prefix)
  admin/                         →  /admin, /admin/clients, /admin/orders, …
    layout.tsx                   (signed-in admins, /admin prefix)
```

Root route checks the profile role and redirects:
- not signed in → `/login`
- admin → `/admin`
- client (or profile not yet linked) → `/orders`

## Consequences

- Admin URLs are explicit: `/admin/clients`, `/admin/orders`,
  `/admin/invoices`. Easier to spot in logs and Vercel dashboards.
- The `(auth)` and `(client)` route groups stay — they don't conflict
  with each other and the path-free client routes (e.g. `/orders`,
  `/venues`) match what users see.
- One small UX cost: when an admin clicks a deep link a client sent them
  (e.g. `/orders/654`), they land in the client-shell version of that
  page. That's fine — admins can view a client's experience — and the
  admin-specific equivalent lives at `/admin/orders/654` for tooling.

## Alternatives considered

- **Keep `(admin)` and put admin URLs under `(admin)/admin/...`.**
  Same end-state URL-wise. Rejected: redundant naming (`(admin)/admin/`
  in the file tree).
- **Drop `(client)` instead and prefix client URLs with `/app` or
  `/dashboard`.** Rejected: ugly URLs for the primary audience.
- **Single layout with conditional rendering.** Rejected: turns the
  shell into a giant `if (isAdmin)` and undoes the layout-as-policy
  benefit.
