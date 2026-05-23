import { statusTone } from '@/lib/utils/status'

const toneClasses: Record<ReturnType<typeof statusTone>, string> = {
  neutral: 'bg-bg text-ink border-border',
  success: 'bg-bg text-success border-success/40',
  warning: 'bg-bg text-warning border-warning/40',
  danger:  'bg-bg text-danger border-danger/40'
}

export function StatusPill({ status }: { status: string | null | undefined }) {
  const tone = statusTone(status)
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded ${toneClasses[tone]}`}
    >
      {status ?? 'Unknown'}
    </span>
  )
}
