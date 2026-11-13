import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

export type Col<T> = {
  key: string; label: string
  cell: (r: T) => ReactNode
  sortBy?: (r: T) => string | number
  csv?: (r: T) => string
}
type Props<T extends { id: number }> = {
  rows: T[]; cols: Col<T>[]; loading: boolean; empty: ReactNode
  sel?: Set<number>; onSel?: (s: Set<number>) => void
  actions?: (r: T) => ReactNode; onRow?: (r: T) => void; pageSize?: number
  storageKey?: string // when set, shows the Columns / Compact controls and remembers them
}
type Prefs = { hidden: string[]; dense: boolean }

const prefKey = (k: string) => `metricraw_admin_tbl_${k}`
function loadPrefs(k?: string): Prefs {
  const none: Prefs = { hidden: [], dense: false }
  if (!k) return none
  try {
    const v = JSON.parse(localStorage.getItem(prefKey(k)) ?? '') as Partial<Prefs>
    return { hidden: Array.isArray(v.hidden) ? v.hidden.filter((x) => typeof x === 'string') : [], dense: v.dense === true }
  } catch { return none }
}

// Sortable table: row selection (shift-click for ranges), keyboard row navigation,
// column / density picker, "show more" and loading skeletons.
export default function DataTable<T extends { id: number }>({ rows, cols, loading, empty, sel, onSel, actions, onRow, pageSize = 12, storageKey }: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [limit, setLimit] = useState(pageSize)
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(storageKey))
  const [menu, setMenu] = useState(false)
  const [cursor, setCursor] = useState(0)
  const all = useRef<HTMLInputElement>(null)
  const last = useRef<number | null>(null)
  const tools = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!storageKey) return
    try { localStorage.setItem(prefKey(storageKey), JSON.stringify(prefs)) } catch { /* storage unavailable */ }
  }, [prefs, storageKey])

  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => { if (!tools.current?.contains(e.target as Node)) setMenu(false) }
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [menu])

  const sorted = useMemo(() => {
    const f = sort ? cols.find((c) => c.key === sort.key)?.sortBy : undefined
    if (!sort || !f) return rows
    return [...rows].sort((a, b) => {
      const x = f(a), y = f(b)
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })
      return c * sort.dir
    })
  }, [rows, cols, sort])

  const visCols = cols.filter((c) => !prefs.hidden.includes(c.key))
  const shownCols = visCols.length ? visCols : cols
  const shown = sorted.slice(0, limit)
  const selected = sel ? shown.filter((r) => sel.has(r.id)).length : 0
  useEffect(() => { if (all.current) all.current.indeterminate = selected > 0 && selected < shown.length })

  function cycle(key: string) {
    setSort((s) => (!s || s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null))
  }
  function toggleAll() {
    if (!sel || !onSel) return
    const next = new Set(sel)
    if (selected === shown.length) shown.forEach((r) => next.delete(r.id))
    else shown.forEach((r) => next.add(r.id))
    onSel(next)
  }
  // Shift + click selects (or clears) everything between the last toggled row and this one.
  function toggle(id: number, idx: number, shift: boolean) {
    if (!sel || !onSel) return
    const next = new Set(sel)
    const on = !sel.has(id)
    const [a, b] = shift && last.current !== null ? [Math.min(last.current, idx), Math.max(last.current, idx)] : [idx, idx]
    for (let i = a; i <= b; i++) { if (shown[i]) { if (on) next.add(shown[i].id); else next.delete(shown[i].id) } }
    last.current = idx
    onSel(next)
  }
  function onRowKey(e: KeyboardEvent<HTMLTableRowElement>, r: T, i: number) {
    if (e.target !== e.currentTarget || e.metaKey || e.ctrlKey || e.altKey) return
    const move = (el: Element | null) => { if (el instanceof HTMLElement) { e.preventDefault(); el.focus() } }
    if (e.key === 'ArrowDown' || e.key === 'j') move(e.currentTarget.nextElementSibling)
    else if (e.key === 'ArrowUp' || e.key === 'k') move(e.currentTarget.previousElementSibling)
    else if (e.key === 'Enter' && onRow) onRow(r)
    else if (e.key === ' ' && sel) { e.preventDefault(); toggle(r.id, i, e.shiftKey) }
  }
  function toggleCol(key: string) {
    setPrefs((p) => ({ ...p, hidden: p.hidden.includes(key) ? p.hidden.filter((k) => k !== key) : [...p.hidden, key] }))
  }

  if (loading) return <div className="adm-skels" aria-busy="true">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="adm-skel" style={{ animationDelay: `${i * 0.08}s` }} />)}</div>
  if (!rows.length) return <div className="adm-emptybox">{empty}</div>

  const focusable = !!(onRow || sel)
  const cur = Math.min(cursor, shown.length - 1)

  return (
    <>
      {storageKey && (
        <div className="adm-ttools" ref={tools}>
          <button className={`adm-fchip${prefs.dense ? ' on' : ''}`} aria-pressed={prefs.dense} onClick={() => setPrefs((p) => ({ ...p, dense: !p.dense }))}>Compact</button>
          <div className="adm-popwrap">
            <button className="adm-fchip" aria-expanded={menu} aria-haspopup="true" onClick={() => setMenu((m) => !m)}>
              Columns{prefs.hidden.length > 0 && <b>{prefs.hidden.length} hidden</b>}
            </button>
            {menu && (
              <div className="adm-pop" role="group" aria-label="Visible columns">
                {cols.map((c) => (
                  <label key={c.key}>
                    <input type="checkbox" checked={shownCols.some((v) => v.key === c.key)} disabled={shownCols.length === 1 && shownCols[0].key === c.key} onChange={() => toggleCol(c.key)} />
                    <span>{c.label}</span>
                  </label>
                ))}
                {prefs.hidden.length > 0 && <button className="adm-link dark" onClick={() => setPrefs((p) => ({ ...p, hidden: [] }))}>Show all</button>}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="adm-scroll">
        <table className={`adm-table${prefs.dense ? ' dense' : ''}`}>
          <thead>
            <tr>
              {sel && <th className="adm-cb"><input ref={all} type="checkbox" checked={shown.length > 0 && selected === shown.length} onChange={toggleAll} aria-label="Select all" /></th>}
              {shownCols.map((c) => (
                <th key={c.key} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                  {c.sortBy ? <button className="adm-th" onClick={() => cycle(c.key)}>{c.label}<span aria-hidden="true">{sort?.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</span></button> : c.label}
                </th>
              ))}
              {actions && <th />}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.id} className={`${sel?.has(r.id) ? 'sel' : ''}${onRow ? ' click' : ''}`}
                tabIndex={focusable ? (i === cur ? 0 : -1) : undefined}
                onFocus={(e) => { if (e.target === e.currentTarget) setCursor(i) }}
                onClick={(e) => { if (onRow && !(e.target as HTMLElement).closest('button,input,a,select,textarea,label')) onRow(r) }}
                onKeyDown={(e) => onRowKey(e, r, i)}>
                {sel && <td className="adm-cb"><input type="checkbox" checked={sel.has(r.id)} onChange={(e) => toggle(r.id, i, (e.nativeEvent as MouseEvent).shiftKey === true)} aria-label={`Select row ${r.id}`} /></td>}
                {shownCols.map((c) => <td key={c.key}>{c.cell(r)}</td>)}
                {actions && <td className="adm-act">{actions(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="adm-tfoot">
        <span>Showing {shown.length} of {sorted.length}</span>
        {sorted.length > limit && <>
          <button className="adm-more" onClick={() => setLimit(limit + pageSize)}>Show more ({sorted.length - limit} more)</button>
          <button className="adm-more" onClick={() => setLimit(sorted.length)}>Show all</button>
        </>}
      </div>
    </>
  )
}
