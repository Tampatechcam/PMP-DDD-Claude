import { Skeleton, SkeletonRow, SkeletonText } from '@/components/ui/Skeleton'

/** Overview route skeleton — count tiles + orders table placeholder. */
export default function AdminOverviewLoading() {
  return (
    <section className="space-y-6" aria-busy="true" aria-label="Loading overview">
      <header className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <SkeletonText width="w-72" />
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-28 rounded-lg" />

      <div className="space-y-2">
        <Skeleton className="h-6 w-36" />
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} cols={5} />
        ))}
      </div>
    </section>
  )
}
