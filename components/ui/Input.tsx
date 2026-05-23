import { forwardRef, useId, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, id, className, ...rest },
  ref
) {
  // useId() is stable across SSR and CSR. A module-level counter (the first
  // version of this file) gave different sequences on the server vs the
  // client and React threw a hydration mismatch.
  const generatedId = useId()
  const inputId = id ?? generatedId

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
