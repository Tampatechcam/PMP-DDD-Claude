'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { inviteUser } from '@/lib/actions/admin-users'

interface ClientOption {
  id: string
  name: string
}

interface Props {
  clients: ClientOption[]
  /** When set, locks the client field to this id and hides the picker. */
  defaultClientId?: string
  /** Locks role=client and hides the role radios — used on the per-client team section. */
  lockRoleClient?: boolean
}

export function InviteUserForm({
  clients,
  defaultClientId,
  lockRoleClient = false
}: Props) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'client'>(
    lockRoleClient ? 'client' : 'client'
  )
  const [clientId, setClientId] = useState<string>(defaultClientId ?? '')
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<
    { kind: 'ok'; email: string } | { kind: 'err'; msg: string } | null
  >(null)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    startTransition(async () => {
      const res = await inviteUser({
        email,
        role,
        clientId: role === 'client' ? clientId : undefined,
        fullName: fullName.trim() || undefined
      })
      if (res.ok) {
        setResult({ kind: 'ok', email })
        setEmail('')
        setFullName('')
      } else {
        setResult({ kind: 'err', msg: res.error })
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border border-border rounded-lg bg-surface p-4 space-y-3"
    >
      <p className="text-sm font-medium">Invite a user</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Email"
          type="email"
          required
          placeholder="someone@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
        <Input
          label="Name (optional)"
          type="text"
          placeholder="Jane Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={pending}
        />
      </div>

      {!lockRoleClient && (
        <fieldset className="space-y-1">
          <legend className="block text-xs font-medium text-ink">Role</legend>
          <div className="flex gap-3 text-sm">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="role"
                value="client"
                checked={role === 'client'}
                onChange={() => setRole('client')}
                disabled={pending}
              />
              Client
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="role"
                value="admin"
                checked={role === 'admin'}
                onChange={() => setRole('admin')}
                disabled={pending}
              />
              Admin
            </label>
          </div>
        </fieldset>
      )}

      {role === 'client' && !defaultClientId && (
        <div className="space-y-1">
          <label htmlFor="iu-client" className="block text-xs font-medium text-ink">
            Client
          </label>
          <select
            id="iu-client"
            required
            className="block w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={pending}
          >
            <option value="">— pick a client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !email || (role === 'client' && !clientId)}>
          {pending ? 'Sending…' : 'Send invite'}
        </Button>
        {result?.kind === 'ok' && (
          <p className="text-sm text-muted" role="status">
            Invite sent to <span className="font-medium text-ink">{result.email}</span>.
          </p>
        )}
        {result?.kind === 'err' && (
          <p className="text-sm text-danger" role="alert">{result.msg}</p>
        )}
      </div>
    </form>
  )
}
