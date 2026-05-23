'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { signInWithPassword, signInWithMagicLink } from '@/lib/actions/auth'

interface Props {
  mode: 'password' | 'magic'
  error?: string
  sent?: boolean
}

/**
 * Login form per ADR 0006. Password by default; one click reveals the
 * magic-link path. Mode lives in the URL (?mode=magic) so back/forward
 * and refresh do the right thing.
 */
export function LoginForm({ mode, error, sent }: Props) {
  // We keep email in local state so toggling between modes doesn't
  // make the user retype it.
  const [email, setEmail] = useState('')

  if (mode === 'magic') {
    return (
      <form action={signInWithMagicLink} className="space-y-4">
        <Input
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {sent && (
          <p className="text-sm text-success" role="status">
            Check your inbox for a sign-in link.
          </p>
        )}
        {error && <ErrorMessage code={error} />}
        <Button type="submit" fullWidth>Email me a link</Button>
        <p className="text-center text-xs text-muted">
          <Link
            href={`/login${email ? `?email=${encodeURIComponent(email)}` : ''}`}
            className="underline underline-offset-2"
          >
            Sign in with password instead
          </Link>
        </p>
      </form>
    )
  }

  return (
    <form action={signInWithPassword} className="space-y-4">
      <Input
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
      />
      {error && <ErrorMessage code={error} />}
      <Button type="submit" fullWidth>Sign in</Button>
      <p className="text-center text-xs text-muted">
        <Link
          href={`/login?mode=magic${email ? `&email=${encodeURIComponent(email)}` : ''}`}
          className="underline underline-offset-2"
        >
          Email me a sign-in link instead
        </Link>
      </p>
    </form>
  )
}

function ErrorMessage({ code }: { code: string }) {
  const message = errorCopy[code] ?? 'Something went wrong. Try again.'
  return (
    <p className="text-sm text-danger" role="alert">
      {message}
    </p>
  )
}

// Generic copy — never reveal whether the email exists.
const errorCopy: Record<string, string> = {
  invalid_credentials: 'Email or password is incorrect.',
  missing_fields: 'Please fill in every field.'
}
