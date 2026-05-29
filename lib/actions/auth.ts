'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { siteOrigin } from '@/lib/utils/site-origin'

/**
 * Auth server actions. Per ADR 0006 we support both password and magic-link.
 *
 * Error UX rule: wrong credentials / unknown email return a single generic
 * message via ?error=invalid_credentials so we don't leak whether an email
 * exists. The same goes for the magic-link flow — we always claim success
 * regardless of whether the address resolves to a user.
 */

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    redirect('/login?error=missing_fields')
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/login?error=invalid_credentials')
  }

  redirect('/orders')
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    redirect('/login?mode=magic&error=missing_fields')
  }

  const supabase = createClient()
  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteOrigin()}/callback?next=/orders`
    }
  })

  // We don't surface failures — always show "check your inbox" to avoid
  // confirming whether the address corresponds to an existing user.
  redirect('/login?mode=magic&sent=1')
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (password.length < 8) {
    redirect('/account?error=password_too_short')
  }
  if (password !== confirm) {
    redirect('/account?error=password_mismatch')
  }

  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    redirect('/account?error=update_failed')
  }
  redirect('/account?updated=1')
}
