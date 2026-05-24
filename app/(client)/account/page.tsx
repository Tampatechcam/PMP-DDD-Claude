import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { PasswordForm } from '@/components/auth/PasswordForm'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { getCurrentClientSelf } from '@/lib/db/clients'
import { getAuthUser } from '@/lib/db/auth'

interface Props {
  searchParams: { error?: string; updated?: string }
}

export default async function AccountPage({ searchParams }: Props) {
  // The (client) layout already gated for a signed-in user via getAuthUser
  // (in lib/db/auth.ts) — it's wrapped in React `cache()` so this second
  // call is a free per-request hit instead of another /auth/v1/user round
  // trip. The null narrow keeps TypeScript happy and is defense-in-depth.
  const user = await getAuthUser()
  if (!user) return null

  const client = await getCurrentClientSelf().catch(() => null)

  return (
    <section className="space-y-6 max-w-xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted">
          {user.email}
          {client?.name && <span> · {client.name}</span>}
        </p>
      </header>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="account" className="w-4 h-4 text-muted" />
          <h2 className="text-sm font-medium">Set or change password</h2>
        </div>
        <p className="text-sm text-muted">
          If you usually sign in with a magic link, set a password here so
          you don’t need to fish a link out of your inbox every time.
        </p>
        <PasswordForm
          error={searchParams.error}
          updated={searchParams.updated === '1'}
        />
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="signOut" className="w-4 h-4 text-muted" />
          <h2 className="text-sm font-medium">Sign out</h2>
        </div>
        <p className="text-sm text-muted">
          Ends this session on every device using this browser.
        </p>
        <SignOutButton />
      </Card>
    </section>
  )
}
