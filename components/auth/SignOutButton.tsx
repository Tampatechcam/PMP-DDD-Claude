import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'

/**
 * Sign-out is a Server Action so the auth cookies are cleared on the
 * response. No client state, no flicker.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost">Sign out</Button>
    </form>
  )
}
