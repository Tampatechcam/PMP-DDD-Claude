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
    <div className="border-b border-warning/25 bg-warning/10">
      <div className="max-w-[1400px] mx-auto px-6 py-2 flex items-center justify-between gap-4">
        <p className="text-sm text-ink">
          Viewing the portal as{' '}
          <strong className="font-semibold text-warning">{client.name}</strong>. Orders and
          venues you create are saved to this client.
        </p>
        <form action={stopViewingAs}>
          <button
            type="submit"
            className="shrink-0 rounded border border-warning/40 px-2.5 py-1 text-xs font-medium text-warning hover:bg-warning/10 transition-colors focus-ring"
          >
            Exit to admin
          </button>
        </form>
      </div>
    </div>
  )
}
