'use client'

import { useState, useTransition } from 'react'
import { previewIntakeCsv, commitIntakeCsv, type IntakeResult } from '@/lib/actions/intake'
import type { IntakeRow } from '@/lib/intake/schema'

type PreviewState =
  | { kind: 'idle' }
  | { kind: 'parseError'; message: string }
  | { kind: 'preview'; valid: { line: number; row: IntakeRow }[]; invalid: { line: number; errors: string[]; raw: Record<string, string> }[] }
  | { kind: 'done'; result: IntakeResult }

export function IntakeForm() {
  const [csv, setCsv] = useState<string>('')
  const [filename, setFilename] = useState<string>('')
  const [state, setState] = useState<PreviewState>({ kind: 'idle' })
  const [pending, startTransition] = useTransition()

  const onFile = async (f: File) => {
    setFilename(f.name)
    const text = await f.text()
    setCsv(text)
    setState({ kind: 'idle' })
  }

  const onPreview = () => {
    if (!csv) return
    startTransition(async () => {
      const r = await previewIntakeCsv(csv)
      if (r.parseError) setState({ kind: 'parseError', message: r.parseError })
      else setState({ kind: 'preview', valid: r.validRows, invalid: r.invalidRows })
    })
  }

  const onCommit = () => {
    if (!csv) return
    startTransition(async () => {
      const result = await commitIntakeCsv(csv)
      setState({ kind: 'done', result })
    })
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        className="text-sm"
      />
      {filename && <p className="text-xs text-muted">Loaded: <code>{filename}</code> ({Math.round(csv.length / 1024)} KB)</p>}

      <div className="flex gap-2">
        <button
          onClick={onPreview}
          disabled={!csv || pending}
          className="text-sm font-medium px-4 py-2 rounded-md border border-border hover:bg-bg disabled:opacity-50"
        >
          {pending && state.kind === 'idle' ? 'Validating…' : 'Validate / Preview'}
        </button>
        {state.kind === 'preview' && state.invalid.length === 0 && state.valid.length > 0 && (
          <button
            onClick={onCommit}
            disabled={pending}
            className="text-sm font-medium px-4 py-2 rounded-md bg-fg text-bg hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Inserting…' : `✓ Approve & create ${state.valid.length} orders`}
          </button>
        )}
      </div>

      {state.kind === 'parseError' && (
        <p className="text-sm text-danger">{state.message}</p>
      )}

      {state.kind === 'preview' && (
        <div className="space-y-3">
          <p className="text-sm">
            <strong>{state.valid.length}</strong> rows valid · <strong className={state.invalid.length > 0 ? 'text-danger' : ''}>{state.invalid.length}</strong> rows invalid
          </p>
          {state.invalid.length > 0 && (
            <div className="border border-danger rounded-md p-3 bg-danger/5 max-h-64 overflow-y-auto">
              <p className="text-sm font-semibold text-danger mb-2">Fix these in your CSV and re-upload:</p>
              <ul className="text-xs space-y-1 font-mono">
                {state.invalid.slice(0, 50).map((r) => (
                  <li key={r.line}>line {r.line}: {r.errors.join(' · ')}</li>
                ))}
              </ul>
            </div>
          )}
          {state.valid.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer">Valid rows ({state.valid.length})</summary>
              <ul className="text-xs mt-2 space-y-1 max-h-64 overflow-y-auto font-mono">
                {state.valid.slice(0, 50).map((r) => (
                  <li key={r.line}>line {r.line}: {r.row.client_name} · {r.row.advisor_name} · {r.row.event_1_date} · {r.row.venue_text}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {state.kind === 'done' && state.result.ok && (
        <div className="border border-success rounded-md p-3 bg-success/5">
          <p className="text-sm font-semibold text-success">✓ Created {state.result.created} orders</p>
          <p className="text-xs text-muted mt-1">Order numbers: {state.result.orderNumbers.join(', ')}</p>
          <p className="text-xs text-muted mt-2">Each row recorded in <code>audit_log</code> with <code>source = admin-bulk-intake</code>.</p>
        </div>
      )}
      {state.kind === 'done' && !state.result.ok && (
        <div className="border border-danger rounded-md p-3 bg-danger/5">
          <p className="text-sm font-semibold text-danger">Import failed</p>
          <p className="text-xs mt-1">{state.result.error}</p>
          {state.result.invalidRows && (
            <ul className="text-xs mt-2 space-y-1 font-mono">
              {state.result.invalidRows.slice(0, 50).map((r) => (
                <li key={r.line}>line {r.line}: {r.errors.join(' · ')}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
