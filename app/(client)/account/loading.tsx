import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

/** Account page skeleton — profile card and settings sections. */
export default function AccountLoading() {
  return (
    <section className="space-y-6 max-w-xl" aria-busy="true" aria-label="Loading account">
      <Skeleton className="h-8 w-32" />

      <Skeleton className="h-24 rounded-lg" />

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 border border-border rounded-lg p-4 bg-surface">
            <Skeleton className="h-5 w-36" />
            <SkeletonText width="w-full" />
            <Skeleton className="h-10 rounded-md" />
          </div>
        ))}
      </div>
    </section>
  )
}
