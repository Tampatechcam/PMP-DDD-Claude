import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/layout/Logo'
import { getAuthUser } from '@/lib/db/auth'
import { signInAsDemoClient, signInAsDemoAdmin } from '@/lib/actions/demo'
import { isDemoAuthEnabled } from '@/lib/env'

interface Props {
  searchParams: { mode?: string; error?: string; sent?: string }
}

export default async function LoginPage({ searchParams }: Props) {
  const user = await getAuthUser()
  if (user) redirect('/orders')

  const mode = searchParams.mode === 'magic' ? 'magic' : 'password'
  const error = searchParams.error
  const sent = searchParams.sent === '1'
  const demoEnabled = isDemoAuthEnabled()

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10 bg-bg auth-backdrop">
      <div className="w-full max-w-sm space-y-7">
        <div className="text-center space-y-3">
          <Logo href="/login" size="lg" />
          <p className="text-sm text-muted">
            Direct mail &amp; digital orders, proofs &amp; history — all in one place.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 shadow-popover">
          <h1 className="text-lg font-semibold tracking-tight mb-1">Sign in</h1>
          <p className="text-sm text-muted mb-5">
            {mode === 'magic'
              ? 'Enter your email and we’ll send you a sign-in link.'
              : 'Use your email and password.'}
          </p>
          <LoginForm mode={mode} error={error} sent={sent} />

          <div className="my-5 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-wide text-muted">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <GoogleSignInButton />
        </div>

        {/* Temporary demo buttons. Remove (and delete lib/actions/demo.ts)
            before production. */}
        {demoEnabled && (
        <div className="bg-surface/80 border border-dashed border-border rounded-xl p-5 shadow-card">
          <p className="label mb-2">
            Demo
          </p>
          <p className="text-xs text-muted mb-4 leading-relaxed">
            Skip auth and click around with real seed data. Each button
            provisions / refreshes a demo account in the linked Supabase
            project.
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
        )}

        <p className="text-center text-[11px] text-muted">
          © Power Mailers Plus · internal use only
        </p>
      </div>
    </main>
  )
}
