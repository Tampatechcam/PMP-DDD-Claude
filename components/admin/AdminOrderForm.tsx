'use client'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { createOrderAsAdmin } from '@/lib/actions/orders'
import type {
  CascadeVenue,
  CascadeBuilding,
  CascadeRoom,
} from '@/lib/db/venue-cascade'

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
  /** Per-office defaults populated from order history. Used to pre-fill the form. */
  default_class_type?: string | null
  default_mailing_quantity?: number | null
  default_mailer_type?: string | null
  default_start_time?: string | null
  default_end_time?: string | null
  default_charity?: string | null
  default_needs_dm?: boolean | null
  default_needs_digital?: boolean | null
  default_needs_sheet?: boolean | null
}

export type PastVenue = {
  venue_text: string
  venue_address_text: string | null
}

interface Props {
  clients: ClientOption[]
  allOffices: OfficeOption[]
  pastVenues: PastVenue[]
  venues: CascadeVenue[]
  buildings: CascadeBuilding[]
  rooms: CascadeRoom[]
}

/**
 * Admin order creation form. Client picker at the top drives the office
 * picker — all loaded once at page render, no async round-trips. Mirrors
 * the client-side OrderForm but adds client/office selection and initial
 * status fields.
 *
 * Venue is an Office → Venue → Building → Room cascade. The dropdowns filter
 * in memory (no DB round-trips). On selection the form composes a human
 * `venue_text` ("Venue • Building • Room") and `venue_address_text` for the
 * existing server action, and also ships the raw `venue_id` / `building_id` /
 * `room_id` as hidden inputs for forward-compatibility.
 */
export function AdminOrderForm({
  clients,
  allOffices,
  pastVenues,
  venues,
  buildings,
  rooms,
}: Props) {
  const [needsDM, setNeedsDM] = useState(true)
  const [needsDigital, setNeedsDigital] = useState(false)
  const [needsSheet, setNeedsSheet] = useState(false)

  const [clientId, setClientId] = useState('')
  const [officeId, setOfficeId] = useState('')

  const clientOffices = allOffices.filter((o) => o.client_id === clientId)
  const selectedOffice = clientOffices.find((o) => o.id === officeId)
  // When there's exactly one office we auto-select it for the cascade filter.
  const effectiveOfficeId =
    officeId || (clientOffices.length === 1 ? clientOffices[0]!.id : '')

  // ── Venue cascade state ────────────────────────────────────────────
  const [venueId, setVenueId] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [roomId, setRoomId] = useState('')

  // Venues for the selected office (fall back to all if none scoped yet).
  const officeVenues = useMemo(() => {
    if (!effectiveOfficeId) return []
    const scoped = venues.filter((v) => v.office_id === effectiveOfficeId)
    // Office may have no scoped venues yet — show all so the form is usable.
    return scoped.length > 0 ? scoped : venues
  }, [venues, effectiveOfficeId])

  const venueBuildings = useMemo(
    () => buildings.filter((b) => b.venue_id === venueId),
    [buildings, venueId]
  )
  const buildingRooms = useMemo(
    () => rooms.filter((r) => r.building_id === buildingId),
    [rooms, buildingId]
  )

  const selectedVenue = venues.find((v) => v.id === venueId)
  const selectedBuilding = buildings.find((b) => b.id === buildingId)
  const selectedRoom = rooms.find((r) => r.id === roomId)

  // Composed values the existing server action reads.
  const venueText = [
    selectedVenue?.name,
    selectedBuilding?.name,
    selectedRoom?.name,
  ]
    .filter(Boolean)
    .join(' • ')
  const venueAddress = selectedVenue?.address?.formatted ?? ''

  // Most seminar pairs are Mon+Wed or Tue+Thu — show 2 event slots by default.
  // User can click "+ Add another event" up to 4.
  const [eventCount, setEventCount] = useState(2)

  // Charity pre-fills from the selected office's default_charity. User can edit.
  const [charity, setCharity] = useState('')

  // Track which office we've already auto-applied defaults for, so we apply
  // them on first selection but don't fight the user if they change a field.
  const [defaultsAppliedFor, setDefaultsAppliedFor] = useState<string | null>(null)
  if (selectedOffice && defaultsAppliedFor !== selectedOffice.id) {
    if (selectedOffice.default_charity) setCharity(selectedOffice.default_charity)
    if (selectedOffice.default_needs_dm     != null) setNeedsDM(selectedOffice.default_needs_dm)
    if (selectedOffice.default_needs_digital != null) setNeedsDigital(selectedOffice.default_needs_digital)
    if (selectedOffice.default_needs_sheet  != null) setNeedsSheet(selectedOffice.default_needs_sheet)
    setDefaultsAppliedFor(selectedOffice.id)
  }

  // Reset office + cascade when client changes
  function handleClientChange(id: string) {
    setClientId(id)
    setOfficeId('')
    setVenueId('')
    setBuildingId('')
    setRoomId('')
  }

  function handleOfficeChange(id: string) {
    setOfficeId(id)
    // Office scopes venues — clear downstream cascade.
    setVenueId('')
    setBuildingId('')
    setRoomId('')
  }

  function handleVenueChange(id: string) {
    setVenueId(id)
    setBuildingId('')
    setRoomId('')
  }

  function handleBuildingChange(id: string) {
    setBuildingId(id)
    setRoomId('')
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
            onChange={(e) => handleOfficeChange(e.target.value)}
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
        <Input
          name="charity"
          label="Charity / sponsor"
          value={charity}
          onChange={(e) => setCharity(e.target.value)}
          placeholder={selectedOffice?.default_charity ? `Office default: ${selectedOffice.default_charity}` : 'optional'}
        />
        {/* Job name is auto-generated server-side from the new order's number — no manual field needed. */}
      </Card>

      {/* ── Venue (Office → Venue → Building → Room cascade) ─────────── */}
      <Card className="space-y-4">
        <h2 className="text-sm font-medium">Venue</h2>

        {!effectiveOfficeId ? (
          <p className="text-xs text-muted">
            Pick a client and office first — venues are scoped per office.
          </p>
        ) : (
          <>
            <Select
              label="Venue"
              value={venueId}
              onChange={(e) => handleVenueChange(e.target.value)}
            >
              <option value="">— select a venue —</option>
              {officeVenues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </Select>

            {venueId && (
              <Select
                label="Building"
                value={buildingId}
                onChange={(e) => handleBuildingChange(e.target.value)}
              >
                <option value="">
                  {venueBuildings.length ? '— select a building —' : 'No buildings on this venue'}
                </option>
                {venueBuildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            )}

            {buildingId && (
              <Select
                label="Room"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              >
                <option value="">
                  {buildingRooms.length ? '— select a room —' : 'No rooms in this building'}
                </option>
                {buildingRooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            )}

            {venueText && (
              <p className="text-xs text-muted">
                Selected: <span className="text-ink">{venueText}</span>
                {venueAddress ? ` — ${venueAddress}` : ''}
              </p>
            )}
          </>
        )}

        {/* Composed + raw values for the server action */}
        <input type="hidden" name="venue_text" value={venueText} />
        <input type="hidden" name="venue_address_text" value={venueAddress} />
        <input type="hidden" name="venue_id" value={venueId} />
        <input type="hidden" name="building_id" value={buildingId} />
        <input type="hidden" name="room_id" value={roomId} />
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

    