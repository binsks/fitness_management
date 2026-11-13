import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

export type Pt = { label: string; value: number }
export type WeekPt = { label: string; planned: number; done: number }

export function LineChart({ data, unit = '', goal = null }: { data: Pt[]; unit?: string; goal?: number | null }) {
  const [hover, setHover] = useState<number | null>(null)
  const gid = useId()
  if (!data.length) return <p className="db-empty">No entries yet.</p>

  const W = 600, H = 230, P = 36
  const vals = data.map((d) => d.value)
  const all = goal !== null ? [...vals, goal] : vals
  const lo = Math.min(...all), hi = Math.max(...all)
  const span = hi - lo || 1
  const mid = Math.round(((lo + hi) / 2) * 10) / 10
  const x = (i: number) => (data.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (data.length - 1))
  const y = (v: number) => H - P - ((v - lo) / span) * (H - 2 * P - 14)
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)} ${y(d.value)}`).join(' ')
  const area = `${line} L${x(data.length - 1)} ${H - P} L${x(0)} ${H - P}Z`

  function move(clientX: number, el: SVGSVGElement) {
    const r = el.getBoundingClientRect()
    const px = ((clientX - r.left) / r.width) * W
    let best = 0
    data.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i })
    setHover(best)
  }

  const h = hover !== null ? data[hover] : null
  const tipText = h ? `${h.value}${unit}` : ''
  const tipW = tipText.length * 7.2 + 18
  const hx = hover !== null ? x(hover) : 0
  const hy = h ? y(h.value) : 0
  const tx = Math.min(Math.max(hx - tipW / 2, 4), W - tipW - 4)
  const ty = hy - 40 < 2 ? hy + 16 : hy - 40

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="db-chart" role="img" aria-label="Progress chart"
      onMouseMove={(e) => move(e.clientX, e.currentTarget)}
      onTouchMove={(e) => move(e.touches[0].clientX, e.currentTarget)}
      onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2F7FD0" stopOpacity=".45" />
          <stop offset="100%" stopColor="#2F7FD0" stopOpacity=".03" />
        </linearGradient>
      </defs>
      {[hi, mid, lo].map((v, i) => (
        <g key={i}>
          <line x1={P} x2={W - P} y1={y(v)} y2={y(v)} className="db-grid-line" />
          <text x={P - 8} y={y(v) + 4} textAnchor="end" className="db-axis">{v}</text>
        </g>
      ))}
      <path d={area} fill={`url(#${gid})`} />
      {goal !== null && (
        <>
          <line x1={P} x2={W - P} y1={y(goal)} y2={y(goal)} className="db-goal" strokeWidth="2" />
          <text x={W - P} y={y(goal) - 6} textAnchor="end" className="db-axis">Goal {goal}{unit}</text>
        </>
      )}
      <path d={line} pathLength={1} className="db-line" fill="none" stroke="#0E5AA7" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {hover !== null && <line x1={hx} x2={hx} y1={8} y2={H - P} className="db-guide" strokeWidth="1.5" />}
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.value)} r={hover === i ? 6 : 3.5} fill="#FFFFFF" stroke="#0E5AA7" strokeWidth="2.5" style={{ transition: 'r .2s' }} />
      ))}
      <text x={x(0)} y={H - 10} textAnchor={data.length === 1 ? 'middle' : 'start'} className="db-axis">{data[0].label}</text>
      {data.length > 1 && (
        <text x={x(data.length - 1)} y={H - 10} textAnchor="end" className="db-axis">{data[data.length - 1].label}</text>
      )}
      {h && (
        <g className="db-tip" pointerEvents="none">
          <rect x={tx} y={ty} width={tipW} height={26} rx={6} />
          <text x={tx + tipW / 2} y={ty + 17} textAnchor="middle">{tipText}</text>
        </g>
      )}
    </svg>
  )
}

export function WeekBars({ items }: { items: Pt[] }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="db-bars">
      {items.map((it, i) => (
        <div key={i} className="db-bar-col">
          <div className="db-bar-wrap">
            <div className={`db-bar${it.value ? ' on' : ''}`}
              style={{ height: `${Math.max(8, (it.value / max) * 100)}%`, animationDelay: `${0.15 + i * 0.08}s` }}
              title={`${it.value} workout${it.value === 1 ? '' : 's'}`} />
          </div>
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  )
}

// Paired bars per week: striped = planned, solid = completed.
export function PairBars({ items }: { items: WeekPt[] }) {
  const max = Math.max(1, ...items.flatMap((i) => [i.planned, i.done]))
  return (
    <div className="dbx-pbars">
      {items.map((it, i) => (
        <div key={i} className="dbx-pcol">
          <div className="dbx-pwrap">
            <div className="dbx-pplan" style={{ height: `${(it.planned / max) * 100}%`, animationDelay: `${i * 0.06}s` }} title={`${it.planned} planned`} />
            <div className="dbx-pdone" style={{ height: `${(it.done / max) * 100}%`, animationDelay: `${0.1 + i * 0.06}s` }} title={`${it.done} completed`} />
          </div>
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  )
}

// Circular progress ring with a label and a value; optionally clickable.
export function Gauge({ pct, label, value, onClick, hint }: {
  pct: number; label: string; value: string; onClick?: () => void; hint?: string
}) {
  const r = 26
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, pct))
  return (
    <button className="dbx-gauge" onClick={onClick} disabled={!onClick} title={hint} aria-label={`${label}: ${value}`}>
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} className="dbx-g-bg" />
        <circle cx="32" cy="32" r={r} className="dbx-g-fg" strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)} transform="rotate(-90 32 32)"
          style={{ '--c': c } as CSSProperties} />
      </svg>
      <span className="dbx-g-txt"><small>{label}</small><b>{value}</b></span>
    </button>
  )
}

// Counts up from 0 to `to` (skips the animation if the user prefers reduced motion).
export function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0)
  const from = useRef(0) // animate from the last value shown, so live refreshes don't restart at 0
  useEffect(() => {
    const start = from.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); from.current = to; return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900)
      const v = Math.round(start + (to - start) * (1 - Math.pow(1 - p, 3)))
      setN(v)
      from.current = v
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{n}</>
}
