import { redirect } from 'next/navigation'
import { ClientHeader } from '@/components/layout/ClientHeader'
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
    <div className="min-h-screen">
      <ClientHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  )
}
