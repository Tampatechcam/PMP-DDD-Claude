import { forwardRef, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

let idSeq = 0
function nextId() {
  return `in-${++idSeq}`
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, id, className, ...rest },
  ref
) {
  const inputId = id ?? nextId()
  const base =
    'block w-full rounded border border-border bg-surface px-3 py-2 ' +
    'text-sm text-ink placeholder:text-muted ' +
    'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent'
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`${base} ${error ? 'border-danger' : ''} ${className ?? ''}`}
        {...rest}
      />
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
})
