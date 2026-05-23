import { statusTone } from '@/lib/utils/status'

/**
 * Tinted background + colored text + colored 1px border. Reads at a
 * glance, doesn't shout, stays inside the design system's "no big color
 * blocks" rule.
 */
const toneClasses: Record<ReturnType<typeof statusTone>, string> = {
  neutral: 'bg-stone-100 text-stone-700 border-stone-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  danger:  'bg-rose-50 text-rose-800 border-rose-200'
}

export function StatusPill({ status }: { status: string | null | undefined }) {
  const tone = statusTone(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-full ${toneClasses[tone]}`}
    >
      <Dot tone={tone} />
      {status ?? 'Unknown'}
    </span>
  )
}

function Dot({ tone }: { tone: ReturnType<typeof statusTone> }) {
  const colors: Record<ReturnType<typeof statusTone>, string> = {
    neutral: 'bg-stone-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger:  'bg-rose-500'
  }
  return <span className={`w-1.5 h-1.5 rounded-full ${colors[tone]}`} />
}
