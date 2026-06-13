'use client'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { generateInvoice } from '@/lib/actions/invoices'
import { computeInvoiceLineItems } from '@/lib/invoices/compute'
import { formatMoney, formatQuantity } from '@/lib/utils/format'

type Product = { id: string; name: string; price: number }

/**
 * Admin invoice generator. The mailer + tech dropdowns come from the products
 * catalog and pre-select the client's saved defaults — picking a mailer sets
 * the per-piece rate, picking a tech add-on sets its amount. The live preview
 * runs the SAME pure math the server action uses. The server pushes real Stripe
 * price_ids for the mailer + tech lines (unless the rate was overridden).
 */
export function GenerateInvoiceForm({
  orderId,
  needsDM,
  mailingQuantity,
  defaultRate,
  defaultDigital,
  defaultDiscountPct,
  officeState,
  defaultEmail,
  mailerProducts,
  techProducts,
  defaultMailerProductId,
  defaultTechProductId,
}: {
  orderId: string
  orderRef: string
  needsDM: boolean
  mailingQuantity: number | null
  defaultRate: number | null
  defaultDigital: number | null
  defaultDiscountPct: number | null
  officeState: string | null
  defaultEmail: string | null
  mailerProducts: Product[]
  techProducts: Product[]
  defaultMailerProductId: string | null
  defaultTechProductId: string | null
}) {
  const [mailerProductId, setMailerProductId] = useState<string>(defaultMailerProductId ?? '')
  const [rate, setRate] = useState<string>(defaultRate != null ? String(defaultRate) : '')
  const [discount, setDiscount] = useState<string>(
    defaultDiscountPct != null ? String(defaultDiscountPct) : ''
  )
  const [techProductId, setTechProductId] = useState<string>(defaultTechProductId ?? '')
  const [digital, setDigital] = useState<string>(
    defaultDigital != null ? String(defaultDigital) : ''
  )

  const techPrice = techProducts.find((p) => p.id === techProductId)?.price ?? 0

  const calc = computeInvoiceLineItems({
    dmRate: rate ? Number(rate) : null,
    mailingQuantity,
    needsDirectMail: needsDM,
    dmDiscountPct: discount ? Number(discount) : null,
    digital: digital ? Number(digital) : null,
    tech: techPrice || null,
    officeState,
  })

  function onMailerChange(id: string) {
    setMailerProductId(id)
    const p = mailerProducts.find((x) => x.id === id)
    if (p) setRate(String(p.price)) // selecting a product sets the per-piece rate
  }

  return (
    <form
      action={generateInvoice}
      className="border border-border rounded-lg bg-surface p-5 space-y-5 max-w-lg"
    >
      <input type="hidden" name="order_id" value={orderId} />

      <Field label="Billing email (required by Stripe; no email is sent)">
        <input
          name="billing_email"
          type="email"
          required
          defaultValue={defaultEmail ?? ''}
          placeholder="client@example.com"
          className={inputCls}
        />
      </Field>

      {needsDM && (
        <div className="space-y-3">
          <Field label="Mailer (product)">
            <select
              name="mailer_product_id"
              value={mailerProductId}
              onChange={(e) => onMailerChange(e.target.value)}
              className={inputCls}
            >
              <option value="">— custom (use rate below) —</option>
              {mailerProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${p.price}/pc)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mailing quantity (from order)">
            <input
              type="text"
              readOnly
              value={mailingQuantity != null ? formatQuantity(mailingQuantity) : '—'}
              className="block w-full rounded border border-border bg-bg px-3 py-2 text-sm text-muted"
            />
          </Field>
          <Field label="Direct mail rate (per piece) — overrides the product price">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
              <input
                name="invoiced_dm_rate"
                type="number"
                step="0.001"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className={`${inputCls} pl-6`}
              />
            </div>
          </Field>
          <Field label="Direct mail discount">
            <div className="relative">
              <input
                name="dm_discount_pct"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className={`${inputCls} pr-8`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
            </div>
          </Field>
        </div>
      )}

      <Field label="Digital">
        <MoneyInput name="invoiced_digital" value={digital} onChange={setDigital} />
      </Field>
      <Field label="Tech / sequence add-on">
        <select
          name="tech_product_id"
          value={techProductId}
          onChange={(e) => setTechProductId(e.target.value)}
          className={inputCls}
        >
          <option value="">— none —</option>
          {techProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (${p.price})
            </option>
          ))}
        </select>
      </Field>

      <dl className="border-t border-border pt-4 space-y-1.5 text-sm">
        <Line label="Direct mail" value={calc.dmGross} />
        {calc.dmDiscount > 0 && <Line label={`Discount (${discount}%)`} value={-calc.dmDiscount} />}
        <Line label="Digital" value={calc.digital} />
        <Line label="Tech / sequences" value={calc.tech} />
        <Line label="Card processing (3%)" value={calc.ccProcessing} />
        <Line
          label={calc.flTaxable ? 'FL sales tax (7%, DM)' : 'Sales tax'}
          value={calc.estimatedTax}
          hint={calc.flTaxable ? undefined : `no tax — office is ${officeState ?? 'non-FL'}`}
        />
        <div className="flex justify-between border-t border-border pt-2 mt-1 font-semibold">
          <dt>Estimated total</dt>
          <dd className="tabular-nums">{formatMoney(calc.estimatedTotal)}</dd>
        </div>
      </dl>

      <p className="text-xs text-muted">
        Stripe finalizes the invoice and computes the exact tax. Mailer + tech lines
        post as real Stripe products. The client pays from the portal — no email is sent.
      </p>

      <SubmitButton />
    </form>
  )
}

const inputCls =
  'block w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-ink">{label}</label>
      {children}
    </div>
  )
}

function MoneyInput({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
      <input
        name={name}
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className={`${inputCls} pl-6`}
      />
    </div>
  )
}

function Line({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex justify-between text-muted">
      <dt>
        {label}
        {hint && <span className="ml-1 text-xs">({hint})</span>}
      </dt>
      <dd className="tabular-nums text-ink">{formatMoney(value)}</dd>
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} fullWidth>
      {pending ? 'Generating…' : 'Generate invoice'}
    </Button>
  )
}
