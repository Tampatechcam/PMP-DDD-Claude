import { Card } from '@/components/ui/Card'
import { NewVenueForm } from '@/components/venues/NewVenueForm'
import { NewBuildingForm } from '@/components/venues/NewBuildingForm'
import { NewRoomForm } from '@/components/venues/NewRoomForm'
import { DeleteVenueButton } from '@/components/venues/DeleteVenueButton'
import { listVenuesForCurrentClient, type VenueWithChildren } from '@/lib/db/venues'

/**
 * /venues — list + inline create.
 *
 * One page per Part 11. The layout intentionally avoids tabs/accordions
 * (Part 9). For a v1 client with ~5–10 venues this stays readable as a
 * single column. If usage grows past ~20 venues we'll add a search filter
 * here rather than splitting into sub-routes.
 */
export default async function VenuesPage() {
  const venues = await listVenuesForCurrentClient()

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-xl font-medium">Venues</h1>
        <p className="text-sm text-muted">
          Places where you hold seminars. Add a venue once, then list its
          buildings and rooms. Picker on the order form uses these.
        </p>
      </header>

      <Card>
        <h2 className="text-sm font-medium mb-3">Add a venue</h2>
        <NewVenueForm />
      </Card>

      {venues.length === 0 ? (
        <p className="text-sm text-muted">No venues yet.</p>
      ) : (
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
  return (
    <Card as="article" className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium">{venue.name}</h3>
          {addr && (addr.street || addr.city) && (
            <p className="text-xs text-muted">
              {[addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
            </p>
          )}
          {venue.applicable_class_types && venue.applicable_class_types.length > 0 && (
            <p className="text-xs text-muted mt-1">
              Class types: {venue.applicable_class_types.join(' · ')}
            </p>
          )}
          {venue.notes && <p className="text-xs text-muted mt-1">{venue.notes}</p>}
        </div>
        <DeleteVenueButton id={venue.id} name={venue.name} />
      </header>

      <div className="border-t border-border pt-3 space-y-3">
        {venue.buildings.length === 0 ? (
          <p className="text-xs text-muted">No buildings yet.</p>
        ) : (
          <ul className="space-y-3">
            {venue.buildings.map((b) => (
              <li key={b.id} className="space-y-2">
                <h4 className="text-sm font-medium">{b.name}</h4>
                {b.rooms.length === 0 ? (
                  <p className="text-xs text-muted">No rooms yet.</p>
                ) : (
                  <ul className="text-sm space-y-1 ml-4 list-disc marker:text-muted">
                    {b.rooms.map((r) => (
                      <li key={r.id}>
                        {r.name}
                        {r.capacity != null && (
                          <span className="text-muted"> · capacity {r.capacity}</span>
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
