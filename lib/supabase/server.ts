import 'server-only'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Uses the user's anon JWT from the auth cookie — subject to RLS.
 */
export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
      }
    }
  )
}
