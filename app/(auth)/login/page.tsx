/**
 * Login page. Day 2 deliverable.
 *
 * Per ADR 0006: email + password by default, with a "Email me a sign-in
 * link instead" toggle for first-time users and forgot-password cases.
 * See Part 6 of the implementation plan.
 */
export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-6">
        <h1 className="text-lg font-medium mb-1">Sign in</h1>
        <p className="text-sm text-muted mb-4">
          Email + password (with magic-link toggle) lands here (Day 2).
        </p>
      </div>
    </main>
  )
}
