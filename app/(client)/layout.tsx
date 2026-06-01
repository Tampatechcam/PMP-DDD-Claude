import { redirect } from 'next/navigation'
import { ClientSidebar } from '@/components/layout/ClientSidebar'
import { ViewingAsBanner } from '@/components/layout/ViewingAsBanner'
import { getMyProfile } from '@/lib/db/auth'
import { getImpersonatedClientId } from '@/lib/db/impersonation'

/**
 * Client layout guard. Anyone not signed in goes to /login.
 *
 * The client shell is for real clients and for admins actively "viewing as" a
 * client (set from /admin/clients/[id]). An admin who reaches it WITHOUT an
 * impersonation cookie is bounced to /admin: the client-shell readers only add
 * an explicit client_id filter when impersonating, so an un-scoped admin would
 * otherwise get every client's rows back (admin RLS returns all). Fail closed.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')
  if (profile?.role === 'admin') {
    const impersonatedId = await getImpersonatedClientId()
    if (!impersonatedId) redirect('/admin')
  }

  // `lg:flex` rather than always-flex so the Shell's mobile top bar
  // (rendered inside ClientSidebar as a `<lg:hidden>` sibling of the
  // desktop aside) lays out above `main` on small screens instead of
  // crowding next to it. Desktop is unchanged.
  return (
    <div className="min-h-screen lg:flex">
      <ClientSidebar />
      <main className="flex-1 min-w-0">
        <ViewingAsBanner />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </main>
    </div>
  )
}
