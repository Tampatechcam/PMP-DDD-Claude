/**
 * Loading skeleton. Plain animated div + a couple convenience
 * `SkeletonText` / `SkeletonRow` helpers so a Suspense boundary or
 * a loading.tsx file has something semantic to render.
 *
 * Uses the `shimmer` keyframes declared in tailwind.config; falls back
 * to a static pulse on `prefers-reduced-motion`.
 */
export function Skeleton({
  className = '',
  rounded = true
}: {
  className?: string
  rounded?: boolean
}) {
  return (
    <span
      aria-hidden
      className={`block bg-gradient-to-r from-border via-bg to-border bg-[length:200%_100%] animate-shimmer motion-reduce:animate-pulse motion-reduce:bg-border ${
        rounded ? 'rounded' : ''
      } ${className}`}
    />
  )
}

export function SkeletonText({ width = 'w-32' }: { width?: string }) {
  return <Skeleton className={`h-3.5 ${width}`} />
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex gap-3 py-2">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3.5 flex-1 max-w-[8rem]" />
      ))}
    </div>
  )
}
