'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { Icon, type IconName } from './Icon'

/**
 * Lightweight toast system. Provider lives in the root layout so any
 * client component can grab `useToast()` and fire a notification
 * without coordinating with the page that hosts it.
 *
 * No third-party dependency, no portal — toasts render in a fixed
 * container at the bottom-right. Keyboard users can dismiss the most
 * recent one with Esc; everything auto-dismisses on a timer.
 */

export type ToastTone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  tone: ToastTone
  title: string
  description?: string
  /** ms before auto-dismiss. 0 = sticky. Default 4500. */
  duration: number
}

type ToastInput = Omit<Toast, 'id' | 'duration'> & { duration?: number }

interface ToastContextValue {
  toast: (input: ToastInput) => void
  success: (title: string, description?: string) => void
  error:   (title: string, description?: string) => void
  info:    (title: string, description?: string) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (input: ToastInput) => {
      const id = ++idRef.current
      const next: Toast = { duration: 4500, ...input, id }
      setToasts((prev) => [...prev, next])
      if (next.duration > 0) {
        window.setTimeout(() => dismiss(id), next.duration)
      }
    },
    [dismiss]
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ tone: 'success', title, description }),
      error:   (title, description) => toast({ tone: 'error',   title, description, duration: 7000 }),
      info:    (title, description) => toast({ tone: 'info',    title, description })
    }),
    [toast, dismiss]
  )

  // Esc dismisses the most recent toast — a small ergonomic win for
  // keyboard users who don't want to chase the X.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setToasts((prev) => (prev.length ? prev.slice(0, -1) : prev))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // We don't throw — calls fired during SSR / outside provider just
    // become no-ops, which is friendlier than crashing render.
    return {
      toast: () => {}, success: () => {}, error: () => {}, info: () => {}, dismiss: () => {}
    }
  }
  return ctx
}

const toneStyles: Record<ToastTone, { wrap: string; icon: string; iconName: IconName }> = {
  success: { wrap: 'border-success/30 bg-success/5', icon: 'text-success', iconName: 'check' },
  error:   { wrap: 'border-danger/30 bg-danger/5',   icon: 'text-danger',  iconName: 'alert' },
  info:    { wrap: 'border-border bg-surface',       icon: 'text-accent',  iconName: 'sparkles' }
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const styles = toneStyles[toast.tone]
  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto rounded-lg border px-3 py-2.5 shadow-lg shadow-black/5 backdrop-blur-sm animate-slide-up flex items-start gap-2.5 ${styles.wrap}`}
    >
      <span className={`shrink-0 mt-0.5 ${styles.icon}`}>
        <Icon name={styles.iconName} className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-muted mt-0.5 leading-snug">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 text-muted hover:text-ink rounded p-0.5 focus-ring"
      >
        <Icon name="x" className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
