import { useState } from 'react'
import { api } from '../api'
import { CountUp } from '../dashboard/charts'
import { errText, fmtDate, money } from '../dashboard/util'
import { useToast } from './toast'
import type { GoFn, Stats } from './types'

function Stat({ label, value, sub, warn, onClick, hint }: { label: string; value: number | string; sub?: string; warn?: boolean; onClick?: () => void; hint?: string }) {
  const body = <><span>{label}</span><b>{typeof value === 'number' ? <CountUp to={value} /> : value}</b>{sub && <small>{sub}</small>}</>
  return onClick
    ? <button className={`adm-stat click${warn ? ' warn' : ''}`} onClick={onClick} title={hint}>{body}</button>
    : <div className={`adm-stat${warn ? ' warn' : ''}`}>{body}</div>
}

type Props = { s: Stats; go: GoFn; onRefresh: () => Promise<void>; updated: Date; live: boolean; onLive: (v: boolean) => void }

export default function Overview({ s, go, onRefresh, updated, live, onLive }: Props) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [restocking, setRestocking] = useState<number | null>(null)
  const [days, setDays] = useState(14)
  const [hover, setHover] = useState<number | null>(null)
  const data = s.signups.slice(-days)
  const mx = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((a, d) => a + d.count, 0)

  async function refresh() {
    setBusy(true)
    try { await onRefresh() } finally { setBusy(false) }
  }
  // Add stock without leaving the overview; undoable.
  async function restock(p: { id: number; name: string; stock: number }, by = 10) {
    setRestocking(p.id)
    try {
      await api.patch(`/api/admin/products/${p.id}/`, { stock: Math.max(0, p.stock) + by })
      await onRefresh()
      toast(`${p.name}: +${by} in stock.`, { undo: async () => { await api.patch(`/api/admin/products/${p.id}/`, { stock: p.stock }); await onRefresh() } })
    } catch (e) {
      toast(errText(e), { ok: false })
    } finally {
      setRestocking(null)
    }
  }

  return (
    <div className="adm-grid">
      <div className="adm-row wide" style={{ margin: '4px 4px 2px' }}>
        <span className="adm-updated">Updated {updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{live ? ' · refreshing every 30 s' : ''}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`adm-link adm-live${live ? ' on' : ''}`} aria-pressed={live} onClick={() => onLive(!live)} title="Refresh these numbers automatically"><i aria-hidden="true" />Live</button>
          <button className="adm-link" onClick={() => void refresh()} disabled={busy}>{busy ? 'Refreshing…' : '↻ Refresh'}</button>
        </div>
      </div>
      <div className="adm-stats">
        <Stat label="Users" value={s.users.total} sub={`${s.users.new_7d} new this week · ${s.users.active} active`} onClick={() => go({ tab: 'users' })} hint="Open users" />
        <Stat label="Orders" value={s.orders.total} sub={`${s.orders.last_7d} in the last 7 days`} onClick={() => go({ tab: 'orders' })} hint="Open orders" />
        <Stat label="Revenue" value={money(s.orders.revenue)} sub="Excluding cancelled orders" onClick={() => go({ tab: 'orders' })} hint="Open orders" />
        <Stat label="Stock alerts" value={s.products.low_stock.length} sub={`${s.products.out_of_stock} out of stock`} warn={s.products.low_stock.length > 0}
          onClick={() => go({ tab: 'products', kind: 'filter', filter: 'low' })} hint="Show low-stock products" />
        <Stat label="Workouts completed" value={s.activity.workouts_completed} sub={`${s.activity.completed_7d} this week`} />
        <Stat label="Plans generated" value={s.activity.plans} sub={`${s.activity.progress_entries} progress entries`} />
      </div>

      <section className="adm-card">
        <div className="adm-row">
          <h2>New sign-ups</h2>
          <div className="adm-pills" role="group" aria-label="Range">
            {[7, 14].map((d) => <button key={d} className={`adm-fchip${days === d ? ' on' : ''}`} onClick={() => setDays(d)}>{d} days</button>)}
          </div>
        </div>
        <p className="adm-help" style={{ margin: '-6px 0 10px' }}>{total} in the last {days} days. Hover a bar for details.</p>
        <div className="adm-bars" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <div key={d.date} className="adm-bcol" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${fmtDate(d.date)}: ${d.count} sign-ups`}>
              {hover === i && <em className="adm-tip">{fmtDate(d.date)} · {d.count} sign-up{d.count === 1 ? '' : 's'}</em>}
              <div className="adm-bwrap"><div className={`adm-chart-bar${d.count ? ' on' : ''}${hover === i ? ' hl' : ''}`} style={{ height: `${Math.max(6, (d.count / mx) * 100)}%`, animationDelay: `${i * 0.03}s` }} /></div>
              <span>{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="adm-card">
        <h2>Low stock</h2>
        {s.products.low_stock.length ? (
          <ul className="adm-list">
            {s.products.low_stock.map((p) => (
              <li key={p.id}><button className="adm-li" onClick={() => go({ tab: 'products', kind: 'edit', id: p.id })}>
                <span>{p.name}</span><b className={p.stock <= 0 ? 'bad' : ''}>{p.stock <= 0 ? 'Out of stock' : `${p.stock} left`} →</b>
              </button>
              <button className="adm-btn sm ghost adm-restock" disabled={restocking === p.id} onClick={() => void restock(p)} title={`Add 10 to ${p.name}`}>+10</button></li>
            ))}
          </ul>
        ) : <p className="adm-empty">Everything is well stocked.</p>}
        <p className="adm-help">Click a product to edit it, or +10 to restock in one click.</p>
      </section>

      <section className="adm-card wide">
        <div className="adm-row"><h2>Recent orders</h2><button className="adm-link dark" onClick={() => go({ tab: 'orders' })}>View all →</button></div>
        {s.recent_orders.length ? (
          <div className="adm-scroll">
            <table className="adm-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                {s.recent_orders.map((o) => (
                  <tr key={o.id} className="click" tabIndex={0} onClick={() => go({ tab: 'orders', kind: 'open', id: o.id })}
                    onKeyDown={(e) => { if (e.key === 'Enter') go({ tab: 'orders', kind: 'open', id: o.id }) }}>
                    <td>#{o.id}</td><td>{o.username}</td><td>{fmtDate(o.created_at)}</td><td><span className="adm-chip">{o.status}</span></td><td>{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="adm-empty">No orders yet.</p>}
        {s.orders.by_status.length > 0 && (
          <div className="adm-chips" style={{ marginTop: 14, marginBottom: 0 }} role="group" aria-label="Orders by status">
            <span className="adm-help" style={{ margin: '6px 6px 0 0' }}>By status:</span>
            {s.orders.by_status.map((b) => <button key={b.status} className="adm-fchip" onClick={() => go({ tab: 'orders', kind: 'filter', filter: b.status })} title={`Show ${b.status} orders`}>{b.status}<b>{b.count}</b></button>)}
          </div>
        )}
      </section>
    </div>
  )
}
