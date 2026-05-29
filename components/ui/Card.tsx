import type { HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'article' | 'section'
  /** Adds hover-lift + stronger shadow. Use when the whole card is a link/button. */
  interactive?: boolean
  /** Vertical density of the default padding. */
  padding?: 'default' | 'tight' | 'none'
}

const paddingClasses: Record<NonNullable<Props['padding']>, string> = {
  default: 'p-4',
  tight: 'p-3',
  none: ''
}

export function Card({
  as: As = 'div',
  className,
  interactive = false,
  padding = 'default',
  ...rest
}: Props) {
  return (
    <As
      className={`bg-surface border border-border rounded-lg shadow-card ${paddingClasses[padding]} ${
        interactive ? 'lift cursor-pointer' : ''
      } ${className ?? ''}`}
      {...rest}
    />
  )
}
