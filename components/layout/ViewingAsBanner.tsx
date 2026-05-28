import { getImpersonatedClientBrief } from '@/lib/db/clients'
import { stopViewingAs } from '@/lib/actions/impersonation'

/**
 * Persistent banner, shown only while an admin is "viewing as" a client.
 * Renders nothing for real clients and for admins who aren't impersonating
 * (getImpersonatedClientBrief returns null in both cases), so it's safe to
 * mount unconditionally at the top of the client shell.
 *
 * "Exit to admin" posts to stopViewingAs, which clears the cookie and
 * redirects back to /admin.
 */
export async function ViewingAsBanner() {
  const client = await getImpersonatedClientBrief()
  if (!client) return null

  return (
    <div className="bg-warning text-white">
      <div className="max-w-[1400px] mx-auto px-6 py-2 flex items-center justify-between gap-4">
        <p className="text-sm">
          Viewing the portal as{' '}
          <strong className="font-semibold">{client.name}</strong>. Orders and
          venues you create are saved to this client.
        </p>
        <form action={stopViewingAs}>
          <button
            type="submit"
            className="shrink-0 rounded border border-white/40 px-2.5 py-1 text-xs font-medium hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-warning"
          >
            Exit to admin
          </button>
        </form>
      </div>
    </div>
  )
}
