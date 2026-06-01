import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/utils/site-origin'

/**
 * OAuth / magic-link callback. Exchanges the ?code= query param for a session
 * cookie, then bounces to ?next= (or /orders). Only relative paths allowed.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = safeNextPath(url.searchParams.get('next'))

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/login?error=invalid_credentials', url.origin))
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
