import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { AddVenuePanel } from '@/components/venues/AddVenuePanel'
import { listVenuesForCurrentClient, type VenueWithChildren } from '@/lib/db/venues'

/**
 * /venues — compact grid of venue cards. Click a card to drill into
 * buildings/rooms; the add forms live behind the drill-in to keep this
 * page scannable when there are many venues.
 */
export default async function VenuesPage() {
  const venues = await listVenuesForCurrentClient()
  const roomCount = venues.reduce(
    (sum, v) => sum + v.buildings.reduce((b, ven) => b + ven.rooms.length, 0),
    0
  )

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Venues</h1>
        <p className="text-sm text-muted">
          {venues.length === 0
            ? 'No venues yet. Add one and it shows up on the order form.'
            : `${venues.length} venue${venues.length === 1 ? '' : 's'} · ${roomCount} room${roomCount === 1 ? '' : 's'}`}
        </p>
      </header>

      <AddVenuePanel />

      {venues.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {venues.map((v) => (
            <li key={v.id}>
              <VenueTile venue={v} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function VenueTile({ venue }: { venue: VenueWithChildren }) {
  const addr = venue.address
  const roomCount = venue.buildings.reduce((n, b) => n + b.rooms.length, 0)
  const addrLine = addr
    ? [addr.city, addr.state].filter(Boolean).join(', ')
    : null

  return (
    <Link
      href={`/venues#${venue.id}`}
      className="block h-full"
    >
      <Card className="h-full flex flex-col gap-2 hover:bg-bg transition-colors">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <h3 className="text-sm font-medium leading-snug truncate">{venue.name}</h3>
        </div>
        {addrLine && (
          <p className="text-xs text-muted truncate inline-flex items-center gap-1">
            <Icon name="mapPin" className="w-3.5 h-3.5 shrink-0" />
            {addrLine}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {venue.applicable_class_types?.slice(0, 4).map((t) => (
            <span
              key={t}
              className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-bg text-muted border border-border"
            >
              {t}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted mt-auto pt-1">
          {venue.buildings.length} building{venue.buildings.length === 1 ? '' : 's'} ·{' '}
          {roomCount} room{roomCount === 1 ? '' : 's'}
        </p>
      </Card>
    </Link>
  )
}
