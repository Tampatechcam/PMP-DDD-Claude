import { logMiddlewareRequest } from '@/lib/axiom/middleware'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  event.waitUntil(logMiddlewareRequest(req))

  const res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) =>
          toSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
      }
    }
  )

  // Refreshes the session cookie if it's expired.
  // Do not put auth gating here — RLS handles security; route groups handle UI.
  const { data: { user } } = await supabase.auth.getUser()

  // Root-route bounce. Previously lived in `app/page.tsx`, but on Netlify's
  // Linux runtime a pure-redirect server component crashes with
  // "Cannot read properties of undefined (reading 'clientModules')" inside
  // app-page.runtime.prod. Doing the redirect at the edge sidesteps the
  // broken page entry entirely. Other auth-gated routes already redirect
  // from their layouts (`app/(client)/layout.tsx`, `app/admin/layout.tsx`)
  // and don't hit this bug.
  if (req.nextUrl.pathname === '/') {
    if (!user) return NextResponse.redirect(new URL('/login', req.url))
    // Don't read profiles.role here — middleware can't hit Postgres via
    // the data layer. Send everyone to /orders; admins click into /admin
    // from the sidebar.
    return NextResponse.redirect(new URL('/orders', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)']
}
