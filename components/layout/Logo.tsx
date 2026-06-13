import Link from 'next/link'

/**
 * Power Mailers Plus brand lockup.
 *
 * The mark (orange map-pin + envelope + blue swoosh) is recreated as inline SVG
 * so it stays crisp at any size and needs no asset file. Brand colors are fixed
 * (they don't follow the app theme); the "MAILERS" wordmark uses `text-ink` so
 * it stays legible in both light and dark.
 *
 * To use the official artwork instead, drop it at `public/logo.svg` (or .png)
 * and swap <PinMark/> for an <Image/> — the lockup/spacing here can stay.
 */

const ORANGE = '#F15B29'
const BLUE = '#1C8FC9' // slightly deepened from the brand sky so wordmark text stays legible on white
const SWOOSH = '#2AA9E0'

const SIZE = {
  sm: { markH: 'h-7', textCls: 'text-base' },
  md: { markH: 'h-9', textCls: 'text-xl' },
  lg: { markH: 'h-12', textCls: 'text-2xl' }
} as const

export function Logo({
  href,
  size = 'md',
  className = ''
}: {
  href?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const { markH, textCls } = SIZE[size]

  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <PinMark className={`${markH} w-auto shrink-0`} />
      <span className={`font-semibold tracking-[0.06em] leading-none ${textCls}`}>
        <span style={{ color: BLUE }}>POWER</span>
        <span className="text-ink"> MAILERS</span>
        <span style={{ color: SWOOSH }} className="ml-0.5 align-top text-[0.6em] font-bold">
          +
        </span>
      </span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex focus-ring rounded-md">
        {inner}
      </Link>
    )
  }
  return inner
}

/** The icon-only mark: orange map-pin, white envelope, blue swoosh accent. */
export function PinMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 52 60"
      className={className}
      role="img"
      aria-label="Power Mailers Plus"
      fill="none"
    >
      {/* light-blue swoosh hugging the pin's right edge */}
      <path
        d="M45 11 C53 23 51.5 40 29 57"
        stroke={SWOOSH}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* orange teardrop pin */}
      <path
        d="M26 2 C13.3 2 3 11.6 3 23.7 C3 35.8 14.6 44 24.4 57.4 C25.2 58.5 26.8 58.5 27.6 57.4 C37.4 44 49 35.8 49 23.7 C49 11.6 38.7 2 26 2 Z"
        fill={ORANGE}
      />
      {/* envelope, slightly tilted for the dynamic feel of the original */}
      <g transform="rotate(-8 26 23)">
        <rect x="12.5" y="13.5" width="27" height="19" rx="2.6" fill="#fff" />
        <path
          d="M13.5 15.5 L26 25 L38.5 15.5"
          stroke={ORANGE}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
