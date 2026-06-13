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
        className="w-6 h-6 rounded-md bg-accent-gradient grid place-items-center text-white text-[11px] font-bold tracking-tight shadow-card ring-1 ring-accent/30 transition-transform group-hover:scale-105 motion-reduce:transform-none"
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
