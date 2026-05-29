import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { getMyProfile } from '@/lib/db/auth'

/**
 * Admin shell, mounted at /admin. Auth + role check is one query thanks to
 * getMyProfile (which itself caches getAuthUser within the request).
 *
 * RLS already prevents an authenticated client from reading another client's
 * data, so this guard is for navigation only.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/orders')

  // `lg:flex` (not always-flex) so the Shell's mobile top bar can
  // stack above `main` below the `lg` breakpoint while keeping the
  // desktop sidebar layout untouched.
  return (
    <div className="min-h-screen lg:flex">
      <AdminSidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </main>
    </div>
  )
}
