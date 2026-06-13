/**
 * Invoice line-item math. Pure functions only — no `server-only` import, so
 * the admin GenerateInvoiceForm (a Client Component) reuses this for its live
 * preview and the server action uses the SAME code to build the real Stripe
 * line items. Stripe owns the final tax + grand total (computed from the FL
 * TaxRate applied to the DM line); we mirror its totals back via webhook.
 */

export const CC_PROCESSING_RATE = 0.03 // 3% of pre-tax subtotal
export const FL_TAX_RATE = 0.07 // 7%, FL offices only — applied by Stripe

/** Round to cents. Avoids 0.1 + 0.2 drift before we hand amounts to Stripe. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export interface InvoiceComputeInput {
  dmRate: number | null
  mailingQuantity: number | null
  needsDirectMail: boolean
  /** Direct-mail discount as a percent, e.g. 5 for "5%". Null/0 = none. */
  dmDiscountPct: number | null
  digital: number | null
  tech: number | null
  /** The order's office state, e.g. "FL". Drives whether tax applies. */
  officeState: string | null
}

export interface InvoiceComputeResult {
  /** DM rate × mailing quantity, before discount. 0 when not a DM order. */
  dmGross: number
  /** Discount applied to the DM line (dmGross × pct). */
  dmDiscount: number
  /** Net DM charged: dmGross − dmDiscount. This is what tax + total use. */
  dmTotal: number
  digital: number
  tech: number
  /** Pre-tax: dmTotal (net) + digital + tech. */
  subtotal: number
  /** 3% of subtotal. */
  ccProcessing: number
  /** True when the order's office is in Florida — DM line is taxed at 7%. */
  flTaxable: boolean
  /** Estimated FL tax (7% of net dmTotal) for the preview. Stripe is authoritative. */
  estimatedTax: number
  /** Preview grand total: subtotal + ccProcessing + estimatedTax. */
  estimatedTotal: number
}

/** Parse a stored discount string ("5%", "6", "") to a number, or null. */
export function parsePercent(raw: string | number | null | undefined): number | null {
  if (raw == null) return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace('%', '').trim())
  return Number.isFinite(n) && n > 0 ? n : null
}

export function computeInvoiceLineItems(
  input: InvoiceComputeInput
): InvoiceComputeResult {
  const dmGross =
    input.needsDirectMail && input.dmRate != null && input.mailingQuantity != null
      ? round2(input.dmRate * input.mailingQuantity)
      : 0
  const pct = input.dmDiscountPct != null && input.dmDiscountPct > 0 ? input.dmDiscountPct : 0
  const dmDiscount = round2(dmGross * (pct / 100))
  const dmTotal = round2(dmGross - dmDiscount)

  const digital = input.digital != null ? round2(input.digital) : 0
  const tech = input.tech != null ? round2(input.tech) : 0

  const subtotal = round2(dmTotal + digital + tech)
  const ccProcessing = round2(subtotal * CC_PROCESSING_RATE)

  const flTaxable = (input.officeState ?? '').trim().toUpperCase() === 'FL'
  // FL sales tax applies to the printed-mailer (tangible-goods) line only.
  const estimatedTax = flTaxable ? round2(dmTotal * FL_TAX_RATE) : 0
  const estimatedTotal = round2(subtotal + ccProcessing + estimatedTax)

  return {
    dmGross,
    dmDiscount,
    dmTotal,
    digital,
    tech,
    subtotal,
    ccProcessing,
    flTaxable,
    estimatedTax,
    estimatedTotal,
  }
}

/** Dollars → integer cents for the Stripe API. */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}
