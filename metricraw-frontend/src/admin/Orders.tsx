import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { errText, fmtDate, money, num, rows } from '../dashboard/util'
import { payLabel } from '../store/helpers'
import { downloadCsv } from './csv'
import DataTable from './DataTable'
import type { Col } from './DataTable'
import type { Intent } from './Crud'
import type { Meta } from './formkit'
import { useConfirm } from './confirm'
import { useToast } from './toast'

type Item = { id: number; product_name: string; unit_price: string | number; quantity: number }
type Order = { id: number; username: string; status: string; total: string | number; shipping_address: string; billing_address?: string; payment_method?: string; created_at: string; items: Item[] }
const FLOW = ['pending', 'paid', 'shipped', 'delivered']
const FALLBACK = [...FLOW, 'cancelled']
const isCancel = (s: string) => /^cancel/i.test(s)
const DAY = 864e5
const WHEN = [{ id: 'all', label: 'Any time', ms: 0 }, { id: 'today', label: 'Today', ms: DAY }, { id: '7d', label: '7 days', ms: 7 * DAY }, { id: '30d', label: '30 days', ms: 30 * DAY }]

// Orders list + a slide-over with the order's items, address and a status stepper.
export default function Orders({ intent }: { intent?: Intent | null }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [list, setList] = useState<Order[]>([])
  const [q, setQ] = useState('')
  const [chip, setChip] = useState('all')
  const [when, setWhen] = useState('all')
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [bulkTo, setBulkTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<Order | null>(null)
  const [choices, setChoices] = useState<string[]>(FALLBACK)
  const handled = useRef(0)

  const load = useCallback(async () => {
    try { setList(rows(await api.get<Order[] | { results: Order[] }>('/api/admin/orders/'))); setErr('') }
    catch (e) { setErr(errText(e)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function show(o: Order) {
    setOpen(o)
    const meta = await api.options<{ actions?: { PUT?: Record<string, Meta> } }>(`/api/admin/orders/${o.id}/`).catch(() => null)
    const c = meta?.actions?.PUT?.status?.choices?.map((x) => String(x.value))
    setChoices(c && c.length ? c : FALLBACK)
  }

  useEffect(() => {
    if (!intent || intent.tab !== 'orders' || handled.current === intent.n) return
    if (intent.kind === 'filter') { // needs no data, so apply it straight away
      handled.current = intent.n
      if (intent.filter) setChip(intent.filter)
      if (intent.q !== undefined) setQ(intent.q)
      return
    }
    if (loading) return
    handled.current = intent.n
    if (intent.kind === 'open') { const o = list.find((x) => x.id === intent.id); if (o) void show(o) }
  })

  // Esc closes the panel; ← / → step to the previous / next order in the current list.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(null); return }
      const t = e.target as HTMLElement
      if (!open || e.metaKey || e.ctrlKey || e.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function setStatus(o: Order, status: string) {
    if (status === o.status) return
    const prev = o.status
    try {
      const upd = await api.patch<Order>(`/api/admin/orders/${o.id}/`, { status })
      setList((l) => l.map((x) => (x.id === o.id ? upd : x)))
      setOpen((cur) => (cur && cur.id === o.id ? upd : cur))
      toast(`Order #${o.id} is now ${status}.`, { undo: async () => {
        const back = await api.patch<Order>(`/api/admin/orders/${o.id}/`, { status: prev })
        setList((l) => l.map((x) => (x.id === o.id ? back : x)))
        setOpen((cur) => (cur && cur.id === o.id ? back : cur))
      } })
    } catch (e) {
      toast(errText(e), { ok: false })
    }
  }

  async function bulkStatus(status: string) {
    const targets = list.filter((o) => sel.has(o.id) && o.status !== status)
    if (!targets.length) { toast('Nothing to change in the selection.', { ok: false }); return }
    if (isCancel(status) && !(await confirm({ title: `Cancel ${targets.length} order${targets.length === 1 ? '' : 's'}?`, body: 'Their status will be set to ' + status + '. You can undo this right after.', confirmLabel: 'Cancel orders', cancelLabel: 'Keep orders', danger: true }))) return
    const res = await Promise.allSettled(targets.map((o) => api.patch<Order>(`/api/admin/orders/${o.id}/`, { status })))
    const done = targets.filter((_, i) => res[i].status === 'fulfilled')
    const upd = new Map(res.flatMap((r, i) => (r.status === 'fulfilled' ? [[targets[i].id, r.value] as const] : [])))
    setList((l) => l.map((x) => upd.get(x.id) ?? x))
    setSel(new Set())
    setBulkTo('')
    toast(`${done.length} order${done.length === 1 ? '' : 's'} set to ${status}${done.length < targets.length ? `, ${targets.length - done.length} failed` : ''}.`, {
      ok: done.length === targets.length,
      undo: done.length ? async () => { await Promise.allSettled(done.map((o) => api.patch(`/api/admin/orders/${o.id}/`, { status: o.status }))); await load() } : undefined,
    })
  }

  const statuses = useMemo(() => [...new Set(list.map((o) => o.status))], [list])
  const visible = useMemo(() => {
    const t = q.trim().toLowerCase()
    const span = WHEN.find((w) => w.id === when)?.ms ?? 0
    const since = when === 'today' ? new Date().setHours(0, 0, 0, 0) : Date.now() - span
    return list.filter((o) => (chip === 'all' || o.status === chip) && (!span || +new Date(o.created_at) >= since)
      && (!t || `${o.id} ${o.username} ${o.status} ${o.shipping_address} ${o.billing_address ?? ''} ${o.payment_method ?? ''}`.toLowerCase().includes(t)))
  }, [list, q, chip, when])

  const cols: Col<Order>[] = [
    { key: 'id', label: 'Order', sortBy: (o) => o.id, csv: (o) => String(o.id), cell: (o) => `#${o.id}` },
    { key: 'user', label: 'Customer', sortBy: (o) => o.username.toLowerCase(), csv: (o) => o.username, cell: (o) => o.username },
    { key: 'date', label: 'Date', sortBy: (o) => o.created_at, csv: (o) => o.created_at, cell: (o) => fmtDate(o.created_at) },
    { key: 'pay', label: 'Billing', sortBy: (o) => o.payment_method ?? '', csv: (o) => payLabel(o.payment_method), cell: (o) => payLabel(o.payment_method) },
    { key: 'status', label: 'Status', sortBy: (o) => o.status, csv: (o) => o.status, cell: (o) => <span className="adm-chip">{o.status}</span> },
    { key: 'items', label: 'Items', sortBy: (o) => o.items.length, csv: (o) => o.items.map((i) => `${i.product_name} x${i.quantity}`).join('; '), cell: (o) => o.items.length },
    { key: 'total', label: 'Total', sortBy: (o) => num(o.total) ?? 0, csv: (o) => String(o.total), cell: (o) => money(o.total) },
  ]

  const nextOf = (o: Order) => {
    const f = FLOW.filter((x) => choices.map((c) => c.toLowerCase()).includes(x))
    const i = f.indexOf(o.status.toLowerCase())
    return i >= 0 && i < f.length - 1 ? f[i + 1] : null
  }
  const pos = open ? visible.findIndex((o) => o.id === open.id) : -1
  function step(d: number) {
    const n = visible[pos + d]
    if (pos >= 0 && n) void show(n)
  }

  const flow = FLOW.filter((s) => choices.map((c) => c.toLowerCase()).includes(s))
  const cancelChoice = choices.find(isCancel)
  const idx = open ? flow.indexOf(open.status.toLowerCase()) : -1
  const next = open && idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null

  return (
    <section className="adm-card">
      <div className="adm-row">
        <h2>Orders</h2>
        <div className="adm-tools">
          <input id="adm-search" className="adm-search" placeholder="Search orders… ( / )" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders"
            onKeyDown={(e) => { if (e.key === 'Escape') { if (q) { setQ(''); e.stopPropagation() } else e.currentTarget.blur() } }} />
          <button className="adm-btn ghost" disabled={!visible.length} onClick={() => downloadCsv('orders.csv', [cols.map((c) => c.label), ...visible.map((o) => cols.map((c) => c.csv?.(o) ?? ''))])}>Export CSV</button>
        </div>
      </div>
      <div className="adm-chips" role="group" aria-label="Filters">
        {[{ id: 'all', n: list.length }, ...statuses.map((s) => ({ id: s, n: list.filter((o) => o.status === s).length }))].map((c) => (
          <button key={c.id} className={`adm-fchip${chip === c.id ? ' on' : ''}`} onClick={() => setChip(c.id)}>{c.id === 'all' ? 'All' : c.id}<b>{c.n}</b></button>
        ))}
      </div>
      <div className="adm-chips" role="group" aria-label="Date range">
        {WHEN.map((w) => <button key={w.id} className={`adm-fchip${when === w.id ? ' on' : ''}`} onClick={() => setWhen(w.id)}>{w.label}</button>)}
      </div>
      {sel.size > 0 && (
        <div className="adm-bulk" role="region" aria-label="Bulk actions">
          <b>{sel.size} selected</b>
          <select className="adm-select" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} aria-label="New status">
            <option value="">Set status to…</option>
            {choices.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="adm-btn sm" disabled={!bulkTo} onClick={() => void bulkStatus(bulkTo)}>Apply</button>
          <button className="adm-link dark" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}
      {err && <div className="db-alert" role="alert">{err}</div>}
      <DataTable rows={visible} cols={cols} loading={loading} sel={sel} onSel={setSel} storageKey="orders"
        empty={<><p>{list.length ? 'No orders match.' : 'No orders yet.'}</p>{list.length > 0 && <button className="adm-btn ghost" onClick={() => { setQ(''); setChip('all'); setWhen('all') }}>Clear filters</button>}</>}
        onRow={(o) => void show(o)}
        actions={(o) => (<>
          {nextOf(o) && <button className="adm-btn sm" title={`Mark order #${o.id} as ${nextOf(o)}`} onClick={() => void setStatus(o, nextOf(o) as string)}>→ {nextOf(o)}</button>}
          <button className="adm-btn sm ghost" onClick={() => void show(o)}>Open</button>
        </>)} />

      {open && (
        <div className="adm-modal side" role="dialog" aria-label={`Order ${open.id}`} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(null) }}>
          <div className="adm-drawer">
            <div className="adm-row">
              <h2>Order #{open.id}</h2>
              <div className="adm-pager">
                <button className="adm-btn sm ghost" onClick={() => step(-1)} disabled={pos <= 0} aria-label="Previous order" title="Previous order (←)">‹</button>
                <span>{pos >= 0 ? `${pos + 1} / ${visible.length}` : ''}</span>
                <button className="adm-btn sm ghost" onClick={() => step(1)} disabled={pos < 0 || pos >= visible.length - 1} aria-label="Next order" title="Next order (→)">›</button>
                <button className="adm-x" onClick={() => setOpen(null)} aria-label="Close">×</button>
              </div>
            </div>
            <p className="adm-help" style={{ margin: '-8px 0 14px' }}>{open.username} · {fmtDate(open.created_at)}</p>

            {flow.length >= 3 && !isCancel(open.status) ? (
              <ol className="adm-steps" aria-label="Order progress">
                {flow.map((s, i) => (
                  <li key={s} className={i <= idx ? 'done' : ''}>
                    <button onClick={() => void setStatus(open, s)} title={`Set to ${s}`}><i>{i < idx ? '✓' : i + 1}</i><span>{s}</span></button>
                  </li>
                ))}
              </ol>
            ) : <p><span className="adm-chip">{open.status}</span></p>}

            <div className="adm-actions" style={{ marginTop: 6 }}>
              {next && <button className="adm-btn" onClick={() => void setStatus(open, next)}>Mark as {next} →</button>}
              {cancelChoice && !isCancel(open.status) && idx !== flow.length - 1 && (
                <button className="adm-btn danger" onClick={async () => {
                  if (await confirm({ title: `Cancel order #${open.id}?`, body: `${open.username}'s order of ${money(open.total)} will be marked as ${cancelChoice}. You can undo this right after.`, confirmLabel: 'Cancel order', cancelLabel: 'Keep order', danger: true })) void setStatus(open, cancelChoice)
                }}>Cancel order</button>
              )}
            </div>
            <label className="adm-field" style={{ marginTop: 14 }}><span>Status</span>
              <select value={open.status} onChange={(e) => void setStatus(open, e.target.value)}>
                {[...new Set([open.status, ...choices])].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <h3 className="adm-h3">Items</h3>
            <ul className="adm-list">
              {open.items.map((i) => <li key={i.id}><span>{i.product_name} × {i.quantity}</span><b>{money((num(i.unit_price) ?? 0) * i.quantity)}</b></li>)}
              <li><b>Total</b><b>{money(open.total)}</b></li>
            </ul>
            <h3 className="adm-h3">Ship to</h3>
            <p className="adm-addr">{open.shipping_address || '—'}</p>
            <h3 className="adm-h3">Billing</h3>
            <p className="adm-addr">{payLabel(open.payment_method)}{open.billing_address ? ` · ${open.billing_address}` : ''}</p>
          </div>
        </div>
      )}
    </section>
  )
}
