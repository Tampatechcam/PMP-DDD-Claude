import Link from 'next/link'
import dynamic from 'next/dynamic'
import { OrderFormSkeleton } from '@/components/orders/OrderFormSkeleton'
import { adminListClients } from '@/lib/db/clients'
import { adminListAllOffices } from '@/lib/db/offices'
import { loadVenueCascade } from '@/lib/db/venue-cascade'

const AdminOrderForm = dynamic(
  () => import('@/components/admin/AdminOrderForm').then((m) => ({ default: m.AdminOrderForm })),
  { loading: () => <OrderFormSkeleton /> }
)

/**
 * /admin/orders/new — admin-only order creation.
 *
 * Fetches clients + offices + the venue cascade (venues, buildings, rooms)
 * upfront so the client component can filter every dropdown in-memory
 * without async round-trips when the operator changes a selection.
 */
export default async function AdminNewOrderPage() {
  const [clients, allOffices, cascade] = await Promise.all([
    adminListClients(),
    adminListAllOffices(),
    loadVenueCascade()
  ])

  return (
    <section className="space-y-5 max-w-2xl">
      <header className="space-y-1">
        <p className="text-xs">
          <Link
            href="/admin/orders"
            className="text-muted hover:text-ink underline underline-offset-2"
          >
            ← Orders
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">New order</h1>
        <p className="text-sm text-muted">
          Pick a client → office → venue. Buildings and rooms filter automatically.
        </p>
      </header>

      <AdminOrderForm
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        allOffices={allOffices}
        venues={cascade.venues}
        buildings={cascade.buildings}
        rooms={cascade.rooms}
      />
    </section>
  )
}
