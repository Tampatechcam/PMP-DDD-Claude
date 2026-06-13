/**
 * Initials avatar — shared between the clients list, the command
 * palette, the admin profile rows. `tone="accent"` is used for group
 * rows so they stand out from individuals (`tone="muted"`).
 *
 * `initials()` is exported so callers can render the same letters in
 * other places (e.g. a header chip) without re-implementing the
 * "first letter + last letter" rule.
 */
export type AvatarTone = 'accent' | 'muted'

export function Avatar({
  name,
  tone = 'muted',
  size = 'md'
}: {
  name: string
  tone?: AvatarTone
  size?: 'sm' | 'md'
}) {
  const sizeCls = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs'
  const toneCls =
    tone === 'accent'
      ? 'bg-accent/5 text-accent border border-accent/20'
      : 'bg-bg text-muted border border-border'
  return (
    <div
      aria-hidden
      className={`shrink-0 rounded grid place-items-center font-medium ${sizeCls} ${toneCls}`}
    >
      {initials(name)}
    </div>
  )
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
