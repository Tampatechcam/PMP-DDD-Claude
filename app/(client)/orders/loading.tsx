import { Skeleton, SkeletonRow, SkeletonText } from '@/components/ui/Skeleton'

/** Client orders list skeleton — header, office switcher, table rows. */
export default function ClientOrdersLoading() {
  return (
    <section className="space-y-5" aria-busy="true" aria-label="Loading orders">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <SkeletonText width="w-48" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </header>

      <Skeleton className="h-10 w-full max-w-md rounded-lg" />

      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonRow key={i} cols={6} />
        ))}
      </div>
    </section>
  )
}
