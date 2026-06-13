'use client'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { updateOrderStatus } from '@/lib/actions/orders'

// Standard workflow values. The order's current value is merged in below so
// a sheet-imported value not in this list (e.g. "Campaign Completed") still
// renders as the selected option.
const DM_STATUSES = [
  'Pending Details',
  'All Details Added',
  'Proof Sent to Client',
  'Revision Requested',
  'Order Sent'
]
const DIGITAL_STATUSES = [
  'Pending Details',
  'All Details Added',
  'Campaign Active',
  'Campaign Completed'
]

function withCurrent(list: string[], current: string | null): string[] {
  if (current && !list.includes(current)) return [current, ...list]
  return list
}

/**
 * Admin-only status editor on the order detail page. Renders a dropdown for
 * whichever channels the order uses (DM / Digital) plus a Save button that
 * posts to the updateOrderStatus server action.
 */
export function OrderStatusEditor({
  orderId,
  refSlug,
  needsDM,
  needsDigital,
  dmStatus,
  digitalStatus
}: {
  orderId: string
  refSlug: string
  needsDM: boolean
  needsDigital: boolean
  dmStatus: string | null
  digitalStatus: string | null
}) {
  if (!needsDM && !needsDigital) return null

  return (
    <form
      action={updateOrderStatus}
      className="border border-border rounded-lg bg-surface p-4 space-y-3"
    >
      <h2 className="label">
        Status (admin)
      </h2>

      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="ref" value={refSlug} />

      {needsDM && (
        <StatusSelect
          name="dm_status"
          label="Direct mail status"
          current={dmStatus}
          options={withCurrent(DM_STATUSES, dmStatus)}
        />
      )}

      {needsDigital && (
        <StatusSelect
          name="digital_status"
          label="Digital status"
          current={digitalStatus}
          options={withCurrent(DIGITAL_STATUSES, digitalStatus)}
        />
      )}

      <SaveButton />
    </form>
  )
}

function StatusSelect({
  name,
  label,
  current,
  options
}: {
  name: string
  label: string
  current: string | null
  options: string[]
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={`st-${name}`} className="block text-xs font-medium text-ink">
        {label}
      </label>
      <select
        id={`st-${name}`}
        name={name}
        defaultValue={current ?? ''}
        className="block w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
      >
        <option value="">— not set —</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save status'}
    </Button>
  )
}
