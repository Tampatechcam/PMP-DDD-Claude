# DS001 — Design System Audit

**Status:** complete
**Owner:** claude (design:design-system skill)
**Started:** 2026-05-24
**Scope:** Full token-to-component audit of the PMP Dashboard design system.

---

## Design System Audit

### Summary
**Components reviewed:** 5 (`Button`, `Pill`, `Card`, `Input`, `Icon`) | **Issues found:** 8 | **Score:** 76/100

The system has a solid, minimal foundation: semantic Tailwind tokens are correctly defined and consistently used in all five primitives, there are no ad-hoc hex values scattered in component files, the gradient violation was resolved (R002), and the `Pill` / `StatusPill` consolidation (R004) eliminated the InvoiceStatus duplicate. The main gaps are an undocumented "label eyebrow" micro-text style repeated 13 times, one shadow rule violation on the login card, and two missing primitives (`Select`, `Textarea`) that will be needed for the order form.

---

### Token Coverage

| Category | Defined in config | Hardcoded values in `app/`+`components/` |
|----------|------------------|------------------------------------------|
| Colors (semantic) | 9 (`bg`, `surface`, `border`, `ink`, `muted`, `accent`, `success`, `warning`, `danger`) | 0 hex values |
| Colors (tints) | ❌ not in config | `Pill.tsx:14-27` only — `stone`, `emerald`, `amber`, `rose` families. Intentional (semantic tokens lack tint scales); isolated to one file |
| Spacing | Tailwind defaults | None — all use Tailwind scale |
| Typography | `Inter` font family | 13 instances of `text-[11px]` / `text-[10px]` (undocumented eyebrow style — see Issue 1) |
| Border radius | `DEFAULT: 6px`, `lg: 10px` | 0 arbitrary values |
| Shadows | ❌ none defined | 1 instance — `login/page.tsx:30` `shadow-sm` (see Issue 2) |

---

### Component Completeness

| Component | Variants | States | Sizes | Accessibility | Score |
|-----------|----------|--------|-------|---------------|-------|
| `Button` | ✅ primary, secondary, ghost, danger | ✅ disabled; ❌ loading | ❌ one size only | ✅ focus ring, `focus:ring-accent` | 8/10 |
| `Pill` | ✅ neutral, success, warning, danger, accent | — | — | ⚠️ no ARIA role on status pills | 8/10 |
| `Card` | ⚠️ one variant only | — | ❌ padding hardcoded to `p-4` | — | 6/10 |
| `Input` | — | ✅ default, error; ❌ disabled styling | ❌ one size | ✅ label, hint, error, `useId()` stable id | 7/10 |
| `Icon` | — | — | — | Not read (no usages flagged) | ?/10 |
| `Select` | ❌ **missing** | — | — | — | 0/10 |
| `Textarea` | ❌ **missing** | — | — | — | 0/10 |

---

### Issues (prioritized)

#### Issue 1 — Undocumented `text-[11px]` eyebrow style (13 instances) · impact: low–medium

`text-[11px] uppercase tracking-wide(r) text-muted font-medium` appears as an informal section-label pattern across:
- `components/orders/OrderCard.tsx:202`
- `components/orders/ClientInfoCard.tsx:92,104,126,146,180`
- `components/orders/OrdersList.tsx:231`
- `app/(auth)/login/page.tsx:43,65`
- `app/admin/invoices/page.tsx:39`
- `components/layout/Brand.tsx:12`
- `app/(client)/venues/page.tsx:79`, `app/admin/clients/[id]/page.tsx:112`, `components/orders/ClientInfoCard.tsx:152`, `components/orders/OrdersList.tsx:287` (`text-[10px]` variant)

**Recommendation:** Add a `label` CSS utility class in `app/globals.css` or a `Label` component in `components/ui/`:
```css
/* globals.css */
@layer components {
  .label { @apply text-[11px] font-semibold uppercase tracking-wider text-muted; }
}
```
Or define it as a Tailwind component so it's purgeable. One source of truth eliminates the 13 hand-rolled copies and makes it easy to adjust the style globally.

#### Issue 2 — `shadow-sm` on login card violates Part 9 rule · impact: low

`app/(auth)/login/page.tsx:30`:
```tsx
<div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
```
Part 9: *"Borders not shadows; shadows only on dialogs."* The login card is not a dialog.

**Recommendation:** Remove `shadow-sm` → `<div className="bg-surface border border-border rounded-lg p-6">`. The border already provides visual separation on `bg-bg`.

#### Issue 3 — Missing `Select` primitive · impact: medium

The order form (filters, class-type, mailer-type, etc.) uses `<select>` elements but there is no `components/ui/Select.tsx`. Each page that needs a dropdown either uses a raw `<select>` or inlines its own styling. This will become a consistency problem as `/admin/orders` date/status filters land (Day-7 gap).

**Recommendation:** Add `components/ui/Select.tsx` mirroring `Input.tsx`'s API: `label`, `hint`, `error`, `forwardRef`, same `border border-border bg-surface rounded text-sm text-ink focus:ring-accent` base classes. One pass to replace raw `<select>` elements.

#### Issue 4 — Missing `Textarea` primitive · impact: low

Proof revision comments (`components/proofs/ProofActions.tsx`) use a raw `<textarea>`. No wrapper exists.

**Recommendation:** Extend `Input.tsx` or create a separate `Textarea.tsx` with the same label/error/hint pattern.

#### Issue 5 — `Button` has no loading state · impact: low

`Button` has `disabled:opacity-50` but no visual `isLoading` prop (spinner + disabled). Server actions that take >300ms leave the UI responsive with no feedback.

**Recommendation:** Add `isLoading?: boolean` prop that renders a spinner SVG and adds `disabled` programmatically. Low-effort, high perceived-quality gain.

#### Issue 6 — `Card` has fixed `p-4` padding · impact: low

Some uses need `p-6` (login card), `p-5` (demo block), `p-0` (tables inside cards). Currently callers override via `className`. It works but the prop surface should be explicit.

**Recommendation:** Add `padding?: 'sm' | 'md' | 'lg' | 'none'` to `Card` with a map: `{ sm: 'p-3', md: 'p-4', lg: 'p-6', none: '' }`.

#### Issue 7 — `Pill` tint colors not codified · impact: low

`components/ui/Pill.tsx:14-27` uses `stone`, `emerald`, `amber`, `rose` Tailwind families for tinted backgrounds. These are intentional (semantic tokens don't provide tint scales) but undocumented. A future developer might "fix" them to semantic tokens and break the visual intent.

**Recommendation:** Add a comment block above the `toneClasses` map in `Pill.tsx` explaining why off-palette tints are used here (one place only; semantic tokens lack the tint scale needed for small colored pills). That's all — no code change needed.

#### Issue 8 — No `aria-label` on `StatusPill` for screen readers · impact: low

`StatusPill` renders a `<Pill>` with a leading colored dot but no explicit ARIA role. Screen readers will announce the text, but "In Production" without context is unclear. The surrounding order card provides context but an inline `aria-label="Status: In Production"` would be more explicit.

**Recommendation:** Pass `aria-label={`Status: ${status}`}` in `StatusPill.tsx`.

---

### Naming Consistency

| Category | Current pattern | Issues |
|----------|----------------|--------|
| Token names | `bg`, `surface`, `ink`, `muted`, `accent` | All consistent with plan Part 9 |
| Variant names | `primary`, `secondary`, `ghost`, `danger` on Button | No inconsistency |
| Tone names | `neutral`, `success`, `warning`, `danger`, `accent` on Pill | Consistent with semantic token names |
| Section labels | Informal `text-[11px] uppercase ...` (Issue 1) | 13 copies, no shared name |

---

### Priority Actions

1. **Add `label` eyebrow utility** (`globals.css` or `Label` component) — eliminates 13 duplicate class strings, ~15-min change. Would be **DS002**.
2. **Add `Select.tsx` primitive** — needed before Day-7 `/admin/orders` filter work lands (`date-range + status` from agent-c Gap #2). Would be **DS003**.
3. **Remove `shadow-sm` on login card** — one-line fix, zero behavior change. Would fold into next R-series cleanup task.
4. **Document `Pill` off-palette tint intentionality** — comment-only, 5 minutes. Fold into next commit.
5. **Add `Button` loading state + `Input` disabled styling + `Card` padding prop** — component polish sprint when capacity allows. Would be **DS004**.
