import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { Button } from '@/components/ui/Button'
import { Brand } from '@/components/layout/Brand'
import { getAuthUser } from '@/lib/db/auth'
import { signInAsDemoClient, signInAsDemoAdmin } from '@/lib/actions/demo'

interface Props {
  searchParams: { mode?: string; error?: string; sent?: string }
}

export default async function LoginPage({ searchParams }: Props) {
  const user = await getAuthUser()
  if (user) redirect('/orders')

  const mode = searchParams.mode === 'magic' ? 'magic' : 'password'
  const error = searchParams.error
  const sent = searchParams.sent === '1'

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10 bg-bg">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex"><Brand href="/login" /></div>
          <p className="text-sm text-muted">
            Direct mail &amp; digital orders, proofs, and history.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <h1 className="text-base font-semibold mb-1">Sign in</h1>
          <p className="text-sm text-muted mb-5">
            {mode === 'magic'
              ? 'Enter your email and we’ll send you a sign-in link.'
              : 'Use your email and password.'}
          </p>
          <LoginForm mode={mode} error={error} sent={sent} />
        </div>

        {/* Temporary demo buttons. Remove (and delete lib/actions/demo.ts)
            before production. */}
        <div className="bg-surface border border-dashed border-border rounded-lg p-5">
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

        <p className="text-center text-[11px] text-muted">
          © PMP — internal use only
        </p>
      </div>
    </main>
  )
}
