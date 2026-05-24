import { statusTone } from '@/lib/utils/status'
import { Pill } from '@/components/ui/Pill'

/**
 * Status pill for orders. Maps the free-text status string to a tone
 * via `statusTone()` and renders through the shared `<Pill>` primitive
 * (see [`components/ui/Pill.tsx`](../ui/Pill.tsx)).
 */
export function StatusPill({ status }: { status: string | null | undefined }) {
  return (
    <Pill tone={statusTone(status)} withDot>
      {status ?? 'Unknown'}
    </Pill>
  )
}
