'use client'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { updateClientPricingDefaults } from '@/lib/actions/products'
import type { ProductRow } from '@/lib/db/products'

const input =
  'block w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent'

/**
 * Editable per-client pricing defaults on the admin client page. The mailer +
 * tech dropdowns source the products catalog; these pre-fill the generate-
 * invoice form so ops doesn't retype rates. Posts to updateClientPricingDefaults.
 */
export function ClientPricingDefaultsForm({
  clientId,
  mailerProducts,
  techProducts,
  defaultMailerProductId,
  defaultTechProductId,
  defaultDigitalBudget,
}: {
  clientId: string
  mailerProducts: ProductRow[]
  techProducts: ProductRow[]
  defaultMailerProductId: string | null
  defaultTechProductId: string | null
  defaultDigitalBudget: number | null
}) {
  return (
    <form action={updateClientPricingDefaults} className="space-y-3">
      <input type="hidden" name="client_id" value={clientId} />

      <Field label="Default mailer">
        <select name="default_mailer_product_id" defaultValue={defaultMailerProductId ?? ''} className={input}>
          <option value="">— none —</option>
          {mailerProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (${Number(p.price)}/pc)
            </option>
          ))}
        </select>
      </Field>

      <Field label="Default tech / sequence">
        <select name="default_tech_product_id" defaultValue={defaultTechProductId ?? ''} className={input}>
          <option value="">— none —</option>
          {techProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (${Number(p.price)})
            </option>
          ))}
        </select>
      </Field>

      <Field label="Default digital budget">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
          <input
            name="default_digital_budget"
            type="number"
            step="1"
            min="0"
            defaultValue={defaultDigitalBudget != null ? Number(defaultDigitalBudget) : ''}
            className={`${input} pl-6`}
          />
        </div>
      </Field>

      <SaveButton />
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-ink">{label}</label>
      {children}
    </div>
  )
}
function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save defaults'}
    </Button>
  )
}
