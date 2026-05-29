import type { ReactNode } from 'react'

/**
 * Small keyboard-shortcut chip — used in the command-palette trigger
 * ("⌘K"), tooltips, and the eventual shortcuts cheat sheet.
 *
 * Stays subtle: same border as inputs, slight letter-spacing for
 * legibility at 10px.
 */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded border border-border bg-bg text-[10px] font-medium text-muted tracking-wide">
      {children}
    </kbd>
  )
}
