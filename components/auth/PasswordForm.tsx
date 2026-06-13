'use client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { updatePassword } from '@/lib/actions/auth'

interface Props {
  error?: string
  updated?: boolean
}

const errorCopy: Record<string, string> = {
  password_too_short: 'Password must be at least 8 characters.',
  password_mismatch: 'The two passwords do not match.',
  update_failed: 'Could not update your password. Try again.'
}

export function PasswordForm({ error, updated }: Props) {
  return (
    <form action={updatePassword} className="space-y-4 max-w-sm">
      <Input
        name="password"
        type="password"
        label="New password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <Input
        name="confirm"
        type="password"
        label="Confirm new password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      {updated && (
        <p className="text-sm text-success" role="status">
          Password updated.
        </p>
      )}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {errorCopy[error] ?? 'Something went wrong. Try again.'}
        </p>
      )}
      <Button type="submit">Update password</Button>
    </form>
  )
}
