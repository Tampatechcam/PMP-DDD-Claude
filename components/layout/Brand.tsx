import Link from 'next/link'

/**
 * Brand wordmark — used in both shell headers. Small navy square next to
 * the name reads as a logo without needing an asset file.
 */
export function Brand({ href = '/', label }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 group">
      <span
        aria-hidden
        className="w-5 h-5 rounded-sm bg-accent grid place-items-center text-bg text-[10px] font-bold tracking-tight"
      >
        P
      </span>
      <span className="text-sm font-semibold tracking-tight">
        PMP
        {label && (
          <span className="text-muted font-normal"> · {label}</span>
        )}
      </span>
    </Link>
  )
}
