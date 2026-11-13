// MetricRaw "M" mark. Use dark on light backgrounds, default (white tile) on dark/photo backgrounds.
export default function LogoMark({ dark = false }: { dark?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={dark ? '#0E5AA7' : '#fff'} />
      <path d="M7 23V12l4.5 6L16 9l4.5 9L25 12v11" fill="none" stroke={dark ? '#fff' : '#0C2C52'} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
