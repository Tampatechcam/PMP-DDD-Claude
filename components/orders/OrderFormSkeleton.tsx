import { Skeleton } from '@/components/ui/Skeleton'

/** Placeholder while the new-order form chunk loads. */
export function OrderFormSkeleton() {
  return (
    <div className="space-y-4 max-w-2xl" aria-busy="true" aria-label="Loading form">
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  )
}
