import Link from 'next/link'

/**
 * Office switcher per Part 10. Active office lives in ?office=<id> so server
 * components own filtering and bookmarks survive refresh. Renders nothing
 * for single-office clients.
 *
 * Pure server component — no JS shipped, just <Link>s.
 */
export function OfficeSwitcher({
  offices,
  activeOfficeId,
  basePath
}: {
  offices: { id: string; name: string }[]
  activeOfficeId: string | null
  basePath: string
}) {
  if (offices.length < 2) return null

  return (
    <nav aria-label="Office filter" className="flex flex-wrap gap-2">
      <Pill href={basePath} active={!activeOfficeId}>
        All offices
      </Pill>
      {offices.map((o) => (
        <Pill
          key={o.id}
          href={`${basePath}?office=${o.id}`}
          active={activeOfficeId === o.id}
        >
          {o.name}
        </Pill>
      ))}
    </nav>
  )
}

function Pill({
  href,
  active,
  children
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  const base =
    'inline-flex items-center px-3 py-1 text-xs font-medium rounded border transition-colors'
  const tone = active
    ? 'bg-ink text-bg border-ink'
    : 'bg-surface text-ink border-border hover:bg-bg'
  return (
    <Link href={href} className={`${base} ${tone}`}>
      {children}
    </Link>
  )
}
