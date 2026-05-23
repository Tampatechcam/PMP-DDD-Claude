'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { decideProof, getProofDownloadUrl } from '@/lib/actions/proofs'

interface Props {
  proofId: string
  status: string
}

/**
 * Approve / Request revision / View PDF for a single proof.
 *
 * View PDF opens a 10-minute signed download URL in a new tab. Approve
 * fires the action immediately; Request revision reveals a comment box
 * first (a typed reason is what makes the next round actually useful).
 */
export function ProofActions({ proofId, status }: Props) {
  const [pending, startTransition] = useTransition()
  const [askingForReason, setAskingForReason] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isPending = status === 'pending'

  const onView = async () => {
    setError(null)
    try {
      const url = await getProofDownloadUrl(proofId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onApprove = () => {
    startTransition(async () => {
      try {
        await decideProof(proofId, 'approved')
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  const onRevise = () => {
    startTransition(async () => {
      try {
        await decideProof(proofId, 'revision_requested', reason || undefined)
        setAskingForReason(false)
        setReason('')
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onView}>
          View PDF
        </Button>
        {isPending && !askingForReason && (
          <>
            <Button type="button" onClick={onApprove} disabled={pending}>
              {pending ? '…' : 'Approve'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAskingForReason(true)}
              disabled={pending}
            >
              Request revision
            </Button>
          </>
        )}
      </div>

      {askingForReason && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-ink">
            What needs to change?
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="block w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            placeholder="Specific changes help us turn this around faster."
          />
          <div className="flex gap-2">
            <Button type="button" onClick={onRevise} disabled={pending}>
              {pending ? '…' : 'Send revision request'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAskingForReason(false)
                setReason('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  )
}
