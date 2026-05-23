import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-accent text-white hover:opacity-90',
  secondary: 'bg-surface text-ink border border-border hover:bg-bg',
  ghost:     'bg-transparent text-ink hover:bg-bg',
  danger:    'bg-danger text-white hover:opacity-90'
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', fullWidth, className, ...rest },
  ref
) {
  const base =
    'inline-flex items-center justify-center rounded text-sm font-medium ' +
    'px-3 py-2 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ' +
    'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg'
  return (
    <button
      ref={ref}
      className={`${base} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className ?? ''}`}
      {...rest}
    />
  )
})
