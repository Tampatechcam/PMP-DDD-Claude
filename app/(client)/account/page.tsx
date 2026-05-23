import { createClient } from '@/lib/supabase/server'
import { PasswordForm } from '@/components/auth/PasswordForm'
import { SignOutButton } from '@/components/auth/SignOutButton'

interface Props {
  searchParams: { error?: string; updated?: string }
}

export default async function AccountPage({ searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // The (client) layout already redirects to /login if user is null, but
  // narrowing here keeps TypeScript happy and is a free defense-in-depth.
  if (!user) return null

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-medium">Account</h1>
        <p className="text-sm text-muted">{user.email}</p>
      </header>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Password</h2>
        <p className="text-sm text-muted">
          If you usually sign in with a magic link, you can set a password
          here so you don’t need to fish a link out of your inbox.
        </p>
        <PasswordForm
          error={searchParams.error}
          updated={searchParams.updated === '1'}
        />
      </div>

      <div className="pt-4 border-t border-border">
        <SignOutButton />
      </div>
    </section>
  )
}
