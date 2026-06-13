'use server'
/**
 * Admin user-management Server Actions.
 *
 *   inviteUser   — creates an auth user via Supabase's invite flow (sends the
 *                  email automatically) and sets the role + client_id on the
 *                  auto-created profile row.
 *   resendInvite — re-sends the same invite email for a user who hasn't yet
 *                  signed in. Refuses once the user has confirmed.
 *
 * Both are admin-gated. The Supabase admin client (`supabaseAdmin`) bypasses
 * RLS, so it's important we check the caller's role first.
 */

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/db/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { siteOrigin } from '@/lib/utils/site-origin'

/**
 * Where the invite email's "Accept" link should land. The auth callback at
 * /callback exchanges the ?code= for a session and redirects to ?next=.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface InviteUserInput {
  email: string
  role: 'admin' | 'client'
  clientId?: string
  fullName?: string
}

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function inviteUser(input: InviteUserInput): Promise<ActionResult> {
  try {
    await requireAdmin()

    const email = input.email?.trim().toLowerCase()
    if (!email || !EMAIL_RE.test(email)) {
      return { ok: false, error: 'Enter a valid email address.' }
    }
    if (input.role !== 'admin' && input.role !== 'client') {
      return { ok: false, error: 'Role must be admin or client.' }
    }
    if (input.role === 'client' && !input.clientId) {
      return { ok: false, error: 'Client users must be linked to a client.' }
    }

    if (input.clientId) {
      const { data: clientRow } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .maybeSingle()
      if (!clientRow) return { ok: false, error: 'Client not found.' }
    }

    const next = input.role === 'admin' ? '/admin' : '/orders'
    const redirectTo = `${siteOrigin()}/callback?next=${encodeURIComponent(next)}`

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: input.fullName ? { full_name: input.fullName.trim() } : undefined
      }
    )
    if (error || !data?.user) {
      return { ok: false, error: error?.message ?? 'Supabase did not return a user.' }
    }

    // The on_auth_user_created trigger has already inserted a profile row
    // with role='client'. Adjust it to match the admin's intent.
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({
        role: input.role,
        client_id: input.role === 'client' ? input.clientId : null,
        full_name: input.fullName?.trim() ?? null
      })
      .eq('id', data.user.id)
    if (profileErr) {
      return { ok: false, error: `Invite sent but profile update failed: ${profileErr.message}` }
    }

    revalidatePath('/admin/profiles')
    if (input.role === 'client' && input.clientId) {
      revalidatePath(`/admin/clients/${input.clientId}`)
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function resendInvite(userId: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    if (!userId) return { ok: false, error: 'Missing userId.' }

    // Pull the user via the admin API to get email + confirmation state.
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (error || !data?.user) {
      return { ok: false, error: error?.message ?? 'User not found.' }
    }
    const u = data.user
    if (u.email_confirmed_at) {
      return { ok: false, error: 'This user has already accepted their invite.' }
    }
    if (!u.email) {
      return { ok: false, error: 'User has no email on file.' }
    }

    // Look up the linked profile for the redirect target.
    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('role, client_id')
      .eq('id', userId)
      .maybeSingle()
    const next = prof?.role === 'admin' ? '/admin' : '/orders'
    const redirectTo = `${siteOrigin()}/callback?next=${encodeURIComponent(next)}`

    const { error: reInvErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      u.email,
      { redirectTo }
    )
    if (reInvErr) return { ok: false, error: reInvErr.message }

    revalidatePath('/admin/profiles')
    if (prof?.client_id) revalidatePath(`/admin/clients/${prof.client_id}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
