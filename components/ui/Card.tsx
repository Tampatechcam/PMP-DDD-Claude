import type { HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'article' | 'section'
}

export function Card({ as: As = 'div', className, ...rest }: Props) {
  return (
    <As
      className={`bg-surface border border-border rounded-lg p-4 ${className ?? ''}`}
      {...rest}
    />
  )
}
