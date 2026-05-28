import { redirect } from 'next/navigation'
import { ClientSidebar } from '@/components/layout/ClientSidebar'
import { ViewingAsBanner } from '@/components/layout/ViewingAsBanner'
import { getAuthUser, getMyProfile } from '@/lib/db/auth'
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
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const profile = await getMyProfile()
  if (profile?.role === 'admin') {
    const impersonatedId = await getImpersonatedClientId()
    if (!impersonatedId) redirect('/admin')
  }

  return (
    <div className="min-h-screen flex">
      <ClientSidebar />
      <main className="flex-1 min-w-0">
        <ViewingAsBanner />
        <div className="max-w-[1400px] mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
