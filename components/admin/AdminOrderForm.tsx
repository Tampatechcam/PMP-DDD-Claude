'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { createOrderAsAdmin } from '@/lib/actions/orders'

const CLASS_TYPES = ['R101', 'W101', 'SS101', 'WAT', 'R90', 'Taxes', 'Other']

const DM_STATUSES = [
  'Pending Details',
  'All Details Added',
  'Proof Sent',
  'Awaiting Your Approval',
  'Revision Requested',
  'Order Sent',
]

const DIGITAL_STATUSES = [
  'Pending Details',
  'All Details Added',
  'Active',
  'Complete',
]

export type ClientOption = {
  id: string
  name: string
}

export type OfficeOption = {
  id: string
  name: string
  client_id: string
  advisor_names: string[] | null
}

export type PastVenue = {
  venue_text: string
  venue_address_text: string | null
}

interface Props {
  clients: ClientOption[]
  allOffices: OfficeOption[]
  pastVenues: PastVenue[]
}

/**
 * Admin order creation form. Client picker at the top drives the office
 * picker — all loaded once at page render, no async round-trips. Mirrors
 * the client-side OrderForm but adds client/office selection and initial
 * status fields.
 */
export function AdminOrderForm({ clients, allOffices, pastVenues }: Props) {
  const [needsDM, setNeedsDM] = useState(true)
  const [needsDigital, setNeedsDigital] = useState(false)
  const [needsSheet, setNeedsSheet] = useState(false)

  const [clientId, setClientId] = useState('')
  const [officeId, setOfficeId] = useState('')

  const clientOffices = allOffices.filter((o) => o.client_id === clientId)
  const selectedOffice = clientOffices.find((o) => o.id === officeId)

  const [venueText, setVenueText] = useState('')
  const [venueAddress, setVenueAddress] = useState('')

  const [eventCount, setEventCount] = useState(1)

  // Reset office when client changes
  function handleClientChange(id: string) {
    setClientId(id)
    setOfficeId('')
  }

  return (
    <form action={createOrderAsAdmin} className="space-y-6">
      {/* ── Client & Office ────────────────────────────────────────── */}
      <Card className="space-y-4">
        <h2 className="text-sm font-medium">Client</h2>

        <Select
          label="Client"
          name="client_id"
          value={clientId}
          onChange={(e) => handleClientChange(e.target.value)}
          required
        >
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        {clientId && clientOffices.length > 0 && (
          <Select
            label="Office"
            name="office_id"
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
          >
            <option value="">{clientOffices.length === 1 ? clientOffices[0]!.name : 'All offices / unassigned'}</option>
            {clientOffices.length > 1 && clientOffices.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </Select>
        )}

        {/* Hidden single-office value when there's exactly one office */}
        {clientId && clientOffices.length === 1 && (
          <input type="hidden" name="office_id" value={clientOffices[0]!.id} />
        )}

        <AdvisorNameInput office={selectedOffice ?? (clientOffices.length === 1 ? clientOffices[0] : undefined)} />
      </Card>

      {/* ── Order type ─────────────────────────────────────────────── */}
      <Card className="space-y-4">
        <h2 className="text-sm font-medium">Order type</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="needs_direct_mail"
              checked={needsDM}
              onChange={(e) => setNeedsDM(e.target.checked)}
            />
            Direct mail
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="needs_digital"
              checked={needsDigital}
              onChange={(e) => setNeedsDigital(e.target.checked)}
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

      {/* ── Basics ─────────────────────────────────────────────────── */}
      <Card className="space-y-4">
        <h2 className="text-sm font-medium">Basics</h2>

        <Select label="Class type" name="class_type" required>
          {CLASS_TYPES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>

        <Input
          name="market"
          label="Market"
          placeholder='e.g. "South STL #7"'
        />
        <Input name="charity" label="Charity / sponsor (optional)" />
        <Input name="job_name" label="Job name (optional)" />
      </Card>

      {/* ── Venue ──────────────────────────────────────────────────── */}
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

      {/* ── Events ─────────────────────────────────────────────────── */}
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

      {/* ── Direct mail ────────────────────────────────────────────── */}
      {needsDM && (
        <Card className="space-y-4">
          <h2 className="text-sm font-medium">Direct mail</h2>

          <Select label="Initial DM status" name="dm_status">
            {DM_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>

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
              Override mailer return address
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

      {/* ── Digital ────────────────────────────────────────────────── */}
      {needsDigital && (
        <Card className="space-y-4">
          <h2 className="text-sm font-medium">Digital</h2>

          <Select label="Initial digital status" name="digital_status">
            {DIGITAL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>

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

      {/* ── Notes ──────────────────────────────────────────────────── */}
      <Card className="space-y-4">
        <h2 className="text-sm font-medium">Notes</h2>
        <Input name="order_instructions" label="Instructions (optional)" />
        <Input name="notes" label="Internal notes (optional)" />
      </Card>

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

function AdvisorNameInput({ office }: { office?: OfficeOption }) {
  const suggestions = office?.advisor_names ?? []
  return (
    <div>
      <Input
        name="advisor_name"
        label="Advisor name"
        list="advisor-name-suggestions"
        placeholder={suggestions[0] ?? 'e.g. John Smith'}
      />
      <datalist id="advisor-name-suggestions">
        {suggestions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </div>
  )
}
