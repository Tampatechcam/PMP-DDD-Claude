import Link from 'next/link'
import dynamic from 'next/dynamic'
import { OrderFormSkeleton } from '@/components/orders/OrderFormSkeleton'
import { adminListClients } from '@/lib/db/clients'
import { adminListAllOffices } from '@/lib/db/offices'
import { listDistinctVenuesFromOrders } from '@/lib/db/orders'
import { loadVenueCascade } from '@/lib/db/venue-cascade'

const AdminOrderForm = dynamic(
  () => import('@/components/admin/AdminOrderForm').then((m) => ({ default: m.AdminOrderForm })),
  { loading: () => <OrderFormSkeleton /> }
)

/**
 * /admin/orders/new — admin-only order creation.
 *
 * Fetches all clients + all offices upfront so the client component can
 * filter offices by the selected client without any async round-trips.
 * Past venues drive the quick-fill dropdown in the Venue card.
 */
export default async function AdminNewOrderPage() {
  const [clients, allOffices, pastVenues, cascade] = await Promise.all([
    adminListClients(),
    adminListAllOffices(),
    listDistinctVenuesFromOrders(),
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
          Select the client first — offices and advisor suggestions update automatically.
        </p>
      </header>

      <AdminOrderForm
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
       