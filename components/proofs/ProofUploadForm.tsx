'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { issueProofUploadUrl, finalizeProofUpload } from '@/lib/actions/proofs'

interface Props {
  orderId: string
  /** Display label like "#651" or "DIG-001" — already formatted upstream. */
  orderLabel: string
}

/**
 * Admin upload flow per ADR 0005: the browser PUTs the PDF straight to
 * Supabase Storage using a signed upload URL. The Server Action only mints
 * the URL and (after the upload finishes) records the proofs row + audit
 * event. The file itself never traverses a Vercel function.
 */
export function ProofUploadForm({ orderId, orderLabel }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setBusy(true)
    setError(null)
    setProgress('Reserving a slot…')

    try {
      // 1) Ask the server for a signed upload URL + version + path.
      const slot = await issueProofUploadUrl(orderId)

      // 2) PUT the file straight to Storage.
      setProgress(`Uploading v${slot.version} (${humanFileSize(file.size)})…`)
      const supabase = createClient()
      const { error: upErr } = await supabase
        .storage
        .from('proofs')
        .uploadToSignedUrl(slot.path, slot.token, file, {
          contentType: 'application/pdf',
          upsert: false
        })
      if (upErr) throw upErr

      // 3) Confirm — server records the row, audits the event, and redirects.
      setProgress('Finalizing…')
      await finalizeProofUpload(orderId, slot.version, slot.path)
      // The action redirects to /admin/orders/<order_number|display_ref>; if we somehow
      // get here, surface a soft success.
      setProgress('Done.')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-ink mb-1">
          Proof PDF for Order {orderLabel}
        </label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={busy}
          className="block w-full text-sm"
        />
        <p className="text-xs text-muted mt-1">
          The file uploads straight to Supabase Storage — no Vercel function
          in the path, so 6–20 MB PDFs work fine.
        </p>
      </div>

      {progress && !error && (
        <p className="text-sm text-muted" role="status">{progress}</p>
      )}
      {error && (
        <p className="text-sm text-danger" role="alert">{error}</p>
      )}

      <Button type="submit" disabled={!file || busy}>
        {busy ? 'Uploading…' : 'Upload proof'}
      </Button>
    </form>
  )
}

function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
