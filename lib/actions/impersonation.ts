'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getMyProfile } from '@/lib/db/auth'
import { createClient } from '@/lib/supabase/server'
import { IMPERSONATION_COOKIE } from '@/lib/db/impersonation'

/**
 * Start viewing the client app as a given client. Admin-only; the role is
 * re-checked here so the action can't be driven by a non-admin. Validates the
 * client exists (admins can read any client row) before setting the cookie.
 */
export async function startViewingAs(formData: FormData) {
  const clientId = String(formData.get('client_id') ?? '').trim()
  if (!clientId) return

  const profile = await getMyProfile()
  if (profile?.role !== 'admin') {
    throw new Error('Only admins can view client accounts.')
  }

  // Confirm the target exists (and, via RLS, that this caller may read it).
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Client not found.')

  cookies().set(IMPERSONATION_COOKIE, clientId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // session cookie — clears on browser close; admins exit explicitly anyway
  })

  revalidatePath('/orders')
  redirect('/orders')
}

/** Stop impersonating and return to the agency (admin) shell. */
export async function stopViewingAs() {
  cookies().delete(IMPERSONATION_COOKIE)
  revalidatePath('/orders')
  redirect('/admin')
}
