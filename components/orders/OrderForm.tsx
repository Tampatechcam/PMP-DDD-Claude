'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { createOrder } from '@/lib/actions/orders'

const CLASS_TYPES = ['R101', 'W101', 'SS101', 'WAT', 'R90', 'Taxes', 'Other']

export type PastVenue = {
  venue_text: string
  venue_address_text: string | null
}

export type OfficeOption = {
  id: string
  name: string
  advisor_names: string[] | null
}

interface Props {
  isGroup: boolean
  defaultOfficeId: string | null
  offices: OfficeOption[]
  pastVenues: PastVenue[]
}

/**
 * Order form per Part 7. Conditional blocks for Direct Mail and Digital;
 * each block renders only when its checkbox is on. The form-as-action
 * pattern is used end-to-end — no fetch calls, just a Server Action
 * receiving the full FormData.
 *
 * Fields explicitly OUT of this form (Part 7): disclaimer, EIN, registration
 * phone, default mailer return address, internal pricing, responsibility.
 * Those are filled server-side from the client/office profile or by admin.
 */
export function OrderForm({ isGroup, defaultOfficeId, offices, pastVenues }: Props) {
  const [needsDM, setNeedsDM] = useState(true)
  const [needsDigital, setNeedsDigital] = useState(false)
  const [needsSheet, setNeedsSheet] = useState(false)

  const [officeId, setOfficeId] = useState<string>(defaultOfficeId ?? '')
  const office = offices.find((o) => o.id === officeId)

  const [venueText, setVenueText] = useState('')
  const [venueAddress, setVenueAddress] = useState('')

  // Up to 4 events (Part 7). Start with one; users add more as needed.
  const [eventCount, setEventCount] = useState(1)

  return (
    <form action={createOrder} className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-sm font-medium">Order type</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="needs_direct_mail"
              checked={needsDM}
              onChange={(e) => setNeedsDM(e.target.checked)}
              className="accent-accent"
            />
            Direct mail
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="needs_digital"
              checked={needsDigital}
              onChange={(e) => setNeedsDigital(e.target.checked)}
              className="accent-accent"
            />
            Digital
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="needs_google_sheet"
              checked={needsSheet}
              onChange={(e) => setNeedsSheet(e.target.checked)}
            />
            Google sheet
          </label>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-medium">Basics</h2>

        <Select label="Class type" name="class_type" required>
          {CLASS_TYPES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>

        {isGroup && (
          <Select
            label="Office"
            name="office_id"
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
            required
          >
            <option value="">Select an office…</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </Select>
        )}

        <AdvisorNameInput office={office} />

        <Input
          name="market"
          label="Market"
          placeholder='e.g. "South STL #7"'
          required
        />
        <Input name="charity" label="Charity / sponsor (optional)" />
        <Input name="job_name" label="Job name (optional)" />
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-medium">Venue</h2>

        {pastVenues.length > 0 && (
          <Select
            label="Fill from past order"
            value=""
            onChange={(e) => {
              const v = pastVenues.find((p) => p.venue_text === e.target.value)
              if (!v) return
              setVenueText(v.venue_text)
              setVenueAddress(v.venue_address_text ?? '')
            }}
          >
            <option value="">— select a past venue —</option>
            {pastVenues.map((v) => (
              <option key={v.venue_text} value={v.venue_text}>
                {v.venue_text}
              </option>
            ))}
          </Select>
        )}

        <Input
          name="venue_text"
          label="Venue name"
          value={venueText}
          onChange={(e) => setVenueText(e.target.value)}
          placeholder="e.g. DoubleTree by Hilton St. Louis Airport"
        />
        <Input
          name="venue_address_text"
          label="Venue address"
          value={venueAddress}
          onChange={(e) => setVenueAddress(e.target.value)}
          placeholder="123 Main St, St. Louis, MO 63101"
        />
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-medium">Events</h2>

        {Array.from({ length: eventCount }).map((_, i) => {
          const n = i + 1
          return (
            <div key={n} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                name={`event_${n}_date`}
                type="date"
                label={`Event ${n} date`}
                required={n === 1}
              />
              <div className="sm:col-span-2">
                <Input name={`event_${n}_room`} label={`Event ${n} room (optional)`} />
              </div>
            </div>
          )
        })}

        {eventCount < 4 && (
          <button
            type="button"
            onClick={() => setEventCount((c) => Math.min(4, c + 1))}
            className="text-xs underline underline-offset-2 text-muted"
          >
            + Add another event
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input name="start_time" type="time" label="Start time" />
          <Input name="end_time" type="time" label="End time" />
        </div>
        <Input name="time_notes" label="Time notes (optional)" />
      </Card>

      {needsDM && (
        <Card className="space-y-4">
          <h2 className="text-sm font-medium">Direct mail</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              name="mailing_quantity"
              type="number"
              min={1}
              step={1}
              label="Mailing quantity"
              placeholder="7000"
            />
            <Input name="mailer_type" label="Mailer type" placeholder="New FTA R101" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              name="client_approval_deadline"
              type="date"
              label="Client approval deadline"
            />
            <Input
              name="order_sent_deadline"
              type="date"
              label="Send deadline"
            />
          </div>
          <Input
            name="sending_list_folder_url"
            type="url"
            label="Sending list folder URL"
          />
          <Input name="qr_code_link" type="url" label="QR code link (optional)" />

          <details>
            <summary className="cursor-pointer text-xs text-muted">
              Override mailer return address (otherwise uses your office default)
            </summary>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-6 gap-2">
              <div className="sm:col-span-4">
                <Input name="return_address_street" label="Street" />
              </div>
              <div className="sm:col-span-3">
                <Input name="return_address_city" label="City" />
              </div>
              <div className="sm:col-span-1">
                <Input name="return_address_state" label="State" maxLength={2} />
              </div>
              <div className="sm:col-span-2">
                <Input name="return_address_zip" label="Zip" />
              </div>
            </div>
          </details>
        </Card>
      )}

      {needsDigital && (
        <Card className="space-y-4">
          <h2 className="text-sm font-medium">Digital</h2>
          <Input
            name="digital_budget"
            type="number"
            min={0}
            step="0.01"
            label="Budget"
            placeholder="840"
          />
          <Input
            name="landing_page_url_direct"
            type="url"
            label="Landing page (direct mail recipients)"
          />
          <Input
            name="landing_page_url_digital"
            type="url"
            label="Landing page (digital recipients)"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input name="privacy_company_name" label="Privacy company name" />
            <Input
              name="privacy_company_website"
              type="url"
              label="Privacy company website"
            />
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-sm font-medium">Notes</h2>
        <Input name="order_instructions" label="Instructions (optional)" />
        <Input name="notes" label="Internal notes (optional)" />
      </Card>

      <div className="bg-bg border border-border rounded p-3 text-xs text-muted">
        Disclaimer, EIN, registration phone, and the default mailer return
        address will be filled in from your account settings.
      </div>

      <Button type="submit">Create order</Button>
    </form>
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const { label, id, className, children, ...rest } = props
  const inputId = id ?? `sel-${label.toLowerCase().replace(/\W+/g, '-')}`
  const base =
    'block w-full rounded border border-border bg-surface px-3 py-2 ' +
    'text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent'
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-xs font-medium text-ink">
        {label}
      </label>
      <select id={inputId} className={`${base} ${className ?? ''}`} {...rest}>
        {children}
      </select>
    </div>
  )
}

/**
 * Renders a free-text advisor name input with the office's saved advisors
 * as datalist suggestions. Editable so the user can override.
 */
function AdvisorNameInput({ office }: { office?: OfficeOption }) {
  const suggestions = office?.advisor_names ?? []
  return (
    <div>
      <Input
        name="advisor_name"
        label="Advisor name"
        list="advisor-name-suggestions"
        placeholder={suggestions[0]}
      />
      <datalist id="advisor-name-suggestions">
        {suggestions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </div>
  )
}
