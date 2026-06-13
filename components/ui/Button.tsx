import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from 'react'
import Link from 'next/link'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface SharedProps {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  /** Shows a leading spinner and disables the control. */
  loading?: boolean
  className?: string
  children?: React.ReactNode
}

type ButtonProps =
  & SharedProps
  & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof SharedProps>
  & { href?: undefined }

type LinkProps =
  & SharedProps
  & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof SharedProps>
  & { href: string }

type Props = ButtonProps | LinkProps

const variantClasses: Record<Variant, string> = {
  primary:   'bg-accent-gradient text-white shadow-card hover:brightness-110 hover:shadow-card-hover',
  secondary: 'bg-surface text-ink border border-border shadow-card hover:bg-bg hover:border-muted/40',
  ghost:     'bg-transparent text-ink hover:bg-bg',
  danger:    'bg-danger text-white shadow-card hover:brightness-110 hover:shadow-card-hover'
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm'
}

const base =
  'inline-flex items-center justify-center gap-2 rounded font-medium ' +
  'transition-all duration-150 active:scale-[.98] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none ' +
  'motion-reduce:active:scale-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg'

function Spinner() {
  return (
    <svg
      className="w-3.5 h-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

/**
 * Discriminated by the presence of `href`:
 *  - with href → renders a Next `<Link>` with the same styling
 *  - without href → renders a `<button>`
 *
 * Callers that previously inlined the primary-button class string on a
 * `<Link>` should pass `href` here instead so there's exactly one source
 * of truth for button shape + tone.
 */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  function Button(props, ref) {
    const { variant = 'primary', size = 'md', fullWidth, loading, className, children, ...rest } = props
    const cls = `${base} ${sizeClasses[size]} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className ?? ''}`
    const content = (
      <>
        {loading && <Spinner />}
        {children}
      </>
    )
    if ('href' in rest && rest.href !== undefined) {
      const { href, ...anchorRest } = rest
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={cls}
          {...anchorRest}
        >
          {content}
        </Link>
      )
    }
    const { disabled, ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cls}
        disabled={disabled || loading}
        {...buttonRest}
      >
        {content}
      </button>
    )
  }
)
