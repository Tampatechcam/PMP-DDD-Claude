import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

/** Venues grid skeleton — header, add panel, venue cards. */
export default function VenuesLoading() {
  return (
    <section className="space-y-6" aria-busy="true" aria-label="Loading venues">
      <header className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <SkeletonText width="w-56" />
      </header>

      <Skeleton className="h-12 rounded-lg" />

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-lg" />
        ))}
      </ul>
    </section>
  )
}
