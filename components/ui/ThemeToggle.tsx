'use client'
import { useEffect, useState } from 'react'
import { Icon } from './Icon'

/**
 * Light / Dark / System theme switcher. Persists the explicit choice
 * (`light` or `dark`) in localStorage; `system` clears the key so the
 * `prefers-color-scheme` media query takes over.
 *
 * The actual class toggle on <html> is performed here AND in the inline
 * script in app/layout.tsx — the inline script avoids flash-of-light on
 * first paint, this one keeps the class in sync when the user clicks.
 */
type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'pmp-theme'

function readSavedTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  // Render a neutral placeholder during SSR so the markup matches the
  // server output exactly; effect below upgrades it once mounted.
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTheme(readSavedTheme())
    setMounted(true)
    // Keep `dark` class in sync with system pref if user is on system.
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (readSavedTheme() === 'system') applyTheme('system')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const update = (next: Theme) => {
    setTheme(next)
    if (next === 'system') window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  // Cycle: light → dark → system → light.
  const cycle = () => update(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
  const label = !mounted
    ? 'Theme'
    : theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'
  const icon = !mounted ? 'sun' : theme === 'light' ? 'sun' : theme === 'dark' ? 'moon' : 'sparkles'

  if (compact) {
    return (
      <button
        type="button"
        onClick={cycle}
        aria-label={`Theme: ${label}. Click to change.`}
        title={`Theme: ${label}`}
        className="inline-flex items-center justify-center w-8 h-8 rounded text-muted hover:bg-bg hover:text-ink transition-colors focus-ring"
      >
        <Icon name={icon} className="w-4 h-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-muted hover:bg-bg hover:text-ink transition-colors focus-ring"
    >
      <Icon name={icon} className="w-4 h-4" />
      <span className="flex-1 text-left">Theme</span>
      <span className="text-xs">{label}</span>
    </button>
  )
}
