import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { NewVenueForm } from '@/components/venues/NewVenueForm'
import { NewBuildingForm } from '@/components/venues/NewBuildingForm'
import { NewRoomForm } from '@/components/venues/NewRoomForm'
import { DeleteVenueButton } from '@/components/venues/DeleteVenueButton'
import { listVenuesForCurrentClient, type VenueWithChildren } from '@/lib/db/venues'

/**
 * /venues — list + inline create.
 *
 * Single column (Part 9: no tabs, no accordions). At v1 scale (5–10 venues
 * per client) this stays readable; past ~20 we'll add a filter here rather
 * than splitting into sub-routes.
 */
export default async function VenuesPage() {
  const venues = await listVenuesForCurrentClient()

  const venueCount = venues.length
  const roomCount = venues.reduce(
    (sum, v) => sum + v.buildings.reduce((b, ven) => b + ven.rooms.length, 0),
    0
  )

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Venues</h1>
        <p className="text-sm text-muted">
          {venueCount === 0
            ? 'No venues yet. Add one and we’ll surface it on the order form.'
            : `${venueCount} venue${venueCount === 1 ? '' : 's'} · ${roomCount} room${roomCount === 1 ? '' : 's'}`}
        </p>
      </header>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="venues" className="w-4 h-4 text-muted" />
          <h2 className="text-sm font-medium">Add a venue</h2>
        </div>
        <NewVenueForm />
      </Card>

      {venues.length > 0 && (
        <ul className="space-y-4">
          {venues.map((v) => (
            <li key={v.id}>
              <VenueCard venue={v} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function VenueCard({ venue }: { venue: VenueWithChildren }) {
  const addr = venue.address
  const roomCount = venue.buildings.reduce((n, b) => n + b.rooms.length, 0)
  return (
    <Card as="article" className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-medium">{venue.name}</h3>
          {addr && (addr.street || addr.city) && (
            <p className="text-xs text-muted mt-0.5 inline-flex items-center gap-1">
              <Icon name="mapPin" className="w-3.5 h-3.5" />
              {[addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted">
            <span>
              {venue.buildings.length} building{venue.buildings.length === 1 ? '' : 's'}
              {' · '}
              {roomCount} room{roomCount === 1 ? '' : 's'}
            </span>
            {venue.applicable_class_types && venue.applicable_class_types.length > 0 && (
              <span>{venue.applicable_class_types.join(' · ')}</span>
            )}
          </div>
          {venue.notes && <p className="text-xs text-muted mt-1">{venue.notes}</p>}
        </div>
        <DeleteVenueButton id={venue.id} name={venue.name} />
      </header>

      <div className="border-t border-border pt-4 space-y-4">
        {venue.buildings.length === 0 ? (
          <p className="text-xs text-muted">No buildings in this venue yet.</p>
        ) : (
          <ul className="space-y-4">
            {venue.buildings.map((b) => (
              <li key={b.id} className="space-y-2">
                <h4 className="text-sm font-medium">{b.name}</h4>
                {b.rooms.length === 0 ? (
                  <p className="text-xs text-muted">No rooms yet.</p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {b.rooms.map((r) => (
                      <li key={r.id} className="flex items-center justify-between border-b border-border/60 py-1">
                        <span>{r.name}</span>
                        {r.capacity != null && (
                          <span className="text-xs text-muted">cap {r.capacity}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <NewRoomForm buildingId={b.id} />
              </li>
            ))}
          </ul>
        )}
        <NewBuildingForm venueId={venue.id} />
      </div>
    </Card>
  )
}
