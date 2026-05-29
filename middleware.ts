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
  await supabase.auth.getUser()

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)']
}
