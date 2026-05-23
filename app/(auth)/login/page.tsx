import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/server'
import { signInAsDemoClient, signInAsDemoAdmin } from '@/lib/actions/demo'

interface Props {
  searchParams: { mode?: string; error?: string; sent?: string }
}

export default async function LoginPage({ searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/orders')

  const mode = searchParams.mode === 'magic' ? 'magic' : 'password'
  const error = searchParams.error
  const sent = searchParams.sent === '1'

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4">
        <div className="bg-surface border border-border rounded-lg p-6">
          <h1 className="text-lg font-medium mb-1">Sign in</h1>
          <p className="text-sm text-muted mb-4">
            {mode === 'magic'
              ? 'Enter your email and we’ll send you a sign-in link.'
              : 'Use your email and password.'}
          </p>
          <LoginForm mode={mode} error={error} sent={sent} />
        </div>

        {/* Temporary demo buttons. Remove (and delete lib/actions/demo.ts)
            before production. */}
        <div className="bg-bg border border-dashed border-border rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-2">
            Demo
          </p>
          <p className="text-xs text-muted mb-3">
            Skip auth and look around. Each button provisions a demo
            account + a seed order in the linked Supabase project.
            Requires migrations 001–006 applied.
          </p>
          <div className="flex gap-2">
            <form action={signInAsDemoClient} className="flex-1">
              <Button type="submit" variant="secondary" fullWidth>
                Demo: Client
              </Button>
            </form>
            <form action={signInAsDemoAdmin} className="flex-1">
              <Button type="submit" variant="secondary" fullWidth>
                Demo: Admin
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
