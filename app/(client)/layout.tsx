import { redirect } from 'next/navigation'
import { ClientSidebar } from '@/components/layout/ClientSidebar'
import { getAuthUser } from '@/lib/db/auth'

/**
 * Client layout guard. Anyone not signed in goes to /login. Admins still see
 * client pages (they may want to view a client's experience); their own shell
 * lives under /admin.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex">
      <ClientSidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
