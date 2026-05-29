'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { Icon } from '@/components/ui/Icon'
import { decideProof, getProofDownloadUrl } from '@/lib/actions/proofs'

interface Props {
  proofId: string
  status: string
}

/**
 * Approve / Request revision / View PDF for a single proof.
 *
 * View PDF embeds a 10-minute signed URL inline via the browser-native
 * PDF viewer (no third-party JS) with an "Open in new tab" affordance
 * for users who want a bigger window. Approve fires immediately;
 * Request revision reveals a comment box first.
 *
 * Success / failure feedback runs through the toast system so the
 * confirmation isn't lost when the surrounding page re-renders.
 */
export function ProofActions({ proofId, status }: Props) {
  const [pending, startTransition] = useTransition()
  const [askingForReason, setAskingForReason] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{ url: string; loading: boolean } | null>(null)
  const toast = useToast()

  const isPending = status === 'pending'

  const onView = async () => {
    setError(null)
    if (viewer) { setViewer(null); return }
    setViewer({ url: '', loading: true })
    try {
      const url = await getProofDownloadUrl(proofId)
      setViewer({ url, loading: false })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      toast.error('Could not open PDF', msg)
      setViewer(null)
    }
  }

  const onApprove = () => {
    startTransition(async () => {
      try {
        await decideProof(proofId, 'approved')
        toast.success('Proof approved', 'Thanks — we’ll keep moving.')
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        toast.error('Could not approve proof', msg)
      }
    })
  }

  const onRevise = () => {
    startTransition(async () => {
      try {
        await decideProof(proofId, 'revision_requested', reason || undefined)
        toast.success('Revision requested', 'We received your notes.')
        setAskingForReason(false)
        setReason('')
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        toast.error('Could not send revision request', msg)
      }
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onView}>
          {viewer ? 'Hide PDF' : 'View PDF'}
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

      {viewer && (
        <div className="rounded-lg border border-border overflow-hidden bg-bg">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="document" className="w-3.5 h-3.5" />
              Proof preview
            </span>
            {viewer.url && (
              <a
                href={viewer.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-ink"
              >
                Open in new tab ↗
              </a>
            )}
          </div>
          {viewer.loading ? (
            <div className="h-[60vh] grid place-items-center text-xs text-muted">
              Loading PDF…
            </div>
          ) : (
            <iframe
              src={viewer.url}
              title="Proof PDF"
              className="w-full h-[60vh] bg-bg"
            />
          )}
        </div>
      )}

      {askingForReason && (
        <div className="space-y-2">
          <label htmlFor={`proof-reason-${proofId}`} className="block text-xs font-medium text-ink">
            What needs to change?
          </label>
          <textarea
            id={`proof-reason-${proofId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="block w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus-ring"
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
