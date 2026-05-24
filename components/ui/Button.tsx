import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from 'react'
import Link from 'next/link'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface SharedProps {
  variant?: Variant
  fullWidth?: boolean
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
  primary:   'bg-accent text-white hover:opacity-90',
  secondary: 'bg-surface text-ink border border-border hover:bg-bg',
  ghost:     'bg-transparent text-ink hover:bg-bg',
  danger:    'bg-danger text-white hover:opacity-90'
}

const base =
  'inline-flex items-center justify-center rounded text-sm font-medium ' +
  'px-3 py-2 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg'

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
    const { variant = 'primary', fullWidth, className, children, ...rest } = props
    const cls = `${base} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className ?? ''}`
    if ('href' in rest && rest.href !== undefined) {
      const { href, ...anchorRest } = rest
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={cls}
          {...anchorRest}
        >
          {children}
        </Link>
      )
    }
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cls}
        {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    )
  }
)
