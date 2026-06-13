import { Resend } from 'resend'

/**
 * Resend client — `RESEND_API_KEY` is provisioned by `vercel integration add resend`.
 * Supabase Auth still sends invite/magic-link emails; use this for custom transactional mail.
 */
export function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendTransactionalEmail(
  input: SendEmailInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const resend = getResend()
  if (!resend) {
    return { ok: false, error: 'Email is not configured (missing RESEND_API_KEY).' }
  }

  const from = input.from ?? process.env.RESEND_FROM_EMAIL ?? 'PMP Dashboard <onboarding@resend.dev>'

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, id: data?.id ?? 'unknown' }
}
