import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { createClient } from '@/lib/supabase/server'

interface Props {
  searchParams: { mode?: string; error?: string; sent?: string }
}

export default async function LoginPage({ searchParams }: Props) {
  // Already signed in? Skip the login page.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/orders')

  const mode = searchParams.mode === 'magic' ? 'magic' : 'password'
  const error = searchParams.error
  const sent = searchParams.sent === '1'

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-6">
        <h1 className="text-lg font-medium mb-1">Sign in</h1>
        <p className="text-sm text-muted mb-4">
          {mode === 'magic'
            ? 'Enter your email and we’ll send you a sign-in link.'
            : 'Use your email and password.'}
        </p>
        <LoginForm mode={mode} error={error} sent={sent} />
      </div>
    </main>
  )
}
