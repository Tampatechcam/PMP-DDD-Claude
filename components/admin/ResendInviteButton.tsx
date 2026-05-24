'use client'
import { useState, useTransition } from 'react'
import { resendInvite } from '@/lib/actions/admin-users'

interface Props {
  userId: string
}

export function ResendInviteButton({ userId }: Props) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const onClick = () => {
    setStatus('idle')
    setError(null)
    startTransition(async () => {
      const res = await resendInvite(userId)
      if (res.ok) setStatus('sent')
      else {
        setStatus('error')
        setError(res.error)
      }
    })
  }

  if (status === 'sent') {
    return <span className="text-xs text-muted">Resent ✓</span>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-xs px-2 py-1 rounded border border-border hover:bg-bg disabled:opacity-50"
      title={error ?? undefined}
    >
      {pending ? 'Sending…' : status === 'error' ? 'Retry' : 'Resend invite'}
    </button>
  )
}
