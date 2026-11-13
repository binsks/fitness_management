import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent as RKey } from 'react'
import { ApiError, api } from '../api'
import type { FieldErrors } from '../api'
import { errText, rows } from '../dashboard/util'
import { downloadCsv } from './csv'
import DataTable from './DataTable'
import type { Col } from './DataTable'
import { buildFields, pretty, toForm, toValue } from './formkit'
import type { Choice, Field, Meta, Raw, Val } from './formkit'
import { useConfirm } from './confirm'
import { useToast } from './toast'

export type Quick = { id: string; label: string; test: (r: Raw) => boolean }
export type Intent = { tab: string; kind: 'new' | 'edit' | 'open' | 'filter'; id?: number; filter?: string; q?: string; n: number }
type Row = Raw & { id: number }
type Props = {
  id: string; title: string; noun: string; endpoint: string
  columns?: string[]; canCreate?: boolean; canDelete?: boolean
  relations?: Record<string, string> // field -> list endpoint (shown as a dropdown)
  inline?: string[]                  // number columns editable right in the table
  quick?: Quick[]                    // filter chips
  intent?: Intent | null
}
type Modal = { mode: 'create' } | { mode: 'edit'; row: Row } | null
type List = Row[] | { results: Row[]; count?: number }
type Opts = { actions?: { POST?: Record<string, Meta>; PUT?: Record<string, Meta> } }

const sameVal = (a: Val, b: Val) => String(a) === String(b)
const nameOf = (r: Raw) => String(r.name ?? r.title ?? r.username ?? `#${r.id}`)

function FieldRow({ f, value, error, onChange }: { f: Field; value: Val; error?: string[]; onChange: (v: Val) => void }) {
  const id = `adm-${f.key}`
  return (
    <div className={`adm-field${error ? ' bad' : ''}${f.kind === 'textarea' || f.kind === 'json' ? ' wide' : ''}`}>
      {f.kind === 'bool' ? (
        <label className="adm-check"><input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /><span>{f.label}</span></label>
      ) : (
        <>
          <label htmlFor={id}>{f.label}</label>
          {f.kind === 'select' ? (
            <select id={id} value={String(value)} onChange={(e) => onChange(e.target.value)}>
              <option value="">— Select —</option>
              {f.choices?.map((c) => <option key={String(c.value)} value={String(c.value)}>{c.display_name}</option>)}
            </select>
          ) : f.kind === 'textarea' || f.kind === 'json' ? (
            <textarea id={id} rows={f.kind === 'json' ? 5 : 3} maxLength={f.maxLength} value={String(value)} onChange={(e) => onChange(e.target.value)} />
          ) : (
            <input id={id} type={f.kind === 'number' ? 'number' : f.kind === 'date' ? 'date' : 'text'}
              step={f.step} min={f.min} max={f.max} maxLength={f.maxLength} value={String(value)} onChange={(e) => onChange(e.target.value)} />
          )}
        </>
      )}
      {error ? error.map((m) => <span className="adm-err" key={m}>{m}</span>) : f.help && <span className="adm-help">{f.help}</span>}
    </div>
  )
}

// A number you can edit by clicking it: Enter saves, Esc cancels.
function InlineCell({ text, value, onCommit }: { text: string; value: unknown; onCommit: (v: string) => Promise<void> }) {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState('')
  const skip = useRef(false)
  if (!edit) {
    return <button className="adm-inline" title="Click to edit" onClick={() => { setV(value === null || value === undefined ? '' : String(value)); setEdit(true) }}>{text}<i aria-hidden="true">✎</i></button>
  }
  const commit = () => { setEdit(false); if (v !== String(value ?? '')) void onCommit(v) }
  return (
    <input className="adm-inl-in" autoFocus type="number" step="any" value={v} onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (skip.current) { skip.current = false; return } commit() }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { skip.current = true; commit() }
        if (e.key === 'Escape') { skip.current = true; setEdit(false) }
      }} />
  )
}

// Searchable, sortable table with filter chips, bulk actions, inline edits, CSV export and a slide-over form.
export default function Crud({ id, title, noun, endpoint, columns, canCreate = true, canDelete = true, relations, inline, quick, intent }: Props) {
  const toast = useToast()
  const confirm = useConfirm()
  const [items, setItems] = useState<Row[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [createFields, setCreateFields] = useState<Field[]>([])
  const [rel, setRel] = useState<Record<string, Choice[]>>({})
  const [q, setQ] = useState('')
  const [chip, setChip] = useState('all')
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [modal, setModal] = useState<Modal>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [form, setForm] = useState<Record<string, Val>>({})
  const [errs, setErrs] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const handled = useRef(0)

  const load = useCallback(async () => {
    try {
      const relEntries = await Promise.all(Object.entries(relations ?? {}).map(async ([k, url]) => {
        const d = await api.get<Raw[] | { results: Raw[] }>(url)
        return [k, rows(d).map((r) => ({ value: r.id as number, display_name: String(r.name ?? r.id) }))] as const
      }))
      const relMap = Object.fromEntries(relEntries) as Record<string, Choice[]>
      const [list, o] = await Promise.all([api.get<List>(endpoint), api.options<Opts>(endpoint).catch(() => null)])
      const data = rows<Row>(list as Row[] | { results?: Row[] })
      setItems(data)
      setCount(!Array.isArray(list) && typeof list.count === 'number' ? list.count : null)
      setRel(relMap)
      setCreateFields(o?.actions?.POST ? buildFields(data[0] ?? {}, o.actions.POST, relMap) : [])
      setLoadErr('')
    } catch (e) {
      setLoadErr(errText(e))
    } finally {
      setLoading(false)
    }
  }, [endpoint, relations])
  useEffect(() => { void load() }, [load])

  const cols = columns ?? (items[0] ? ['id', ...Object.keys(items[0]).filter((k) => k !== 'id' && typeof items[0][k] !== 'object')].slice(0, 6) : [])
  const hasActive = items.some((r) => typeof r.is_active === 'boolean')

  const text = useCallback((r: Row, k: string): string => {
    const v = r[k]
    if (v === null || v === undefined || v === '') return '—'
    if (typeof v === 'boolean') return v ? 'Yes' : 'No'
    if (typeof v === 'object') return Array.isArray(v) ? `${v.length} item${v.length === 1 ? '' : 's'}` : '…'
    return rel[k]?.find((x) => String(x.value) === String(v))?.display_name ?? String(v)
  }, [rel])

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    const test = quick?.find((c) => c.id === chip)?.test
    return items.filter((r) => (!test || test(r)) && (!t || JSON.stringify(r).toLowerCase().includes(t)))
  }, [items, q, chip, quick])

  async function setInline(row: Row, key: string, raw: string) {
    const prev = row[key]
    const next = raw.trim() === '' ? null : Number(raw)
    try {
      const upd = await api.patch<Row>(`${endpoint}${row.id}/`, { [key]: next })
      setItems((l) => l.map((x) => (x.id === row.id ? { ...x, ...upd } : x)))
      toast(`${pretty(key)} updated.`, { undo: async () => { await api.patch(`${endpoint}${row.id}/`, { [key]: prev }); await load() } })
    } catch (e) {
      toast(errText(e), { ok: false })
    }
  }

  // One-click on/off switch for is_active, applied right away and undoable.
  async function toggleActive(row: Row) {
    const next = !row.is_active
    const put = (v: boolean) => setItems((l) => l.map((x) => (x.id === row.id ? { ...x, is_active: v } : x)))
    put(next)
    try {
      const upd = await api.patch<Row>(`${endpoint}${row.id}/`, { is_active: next })
      setItems((l) => l.map((x) => (x.id === row.id ? { ...x, ...upd } : x)))
      toast(`${nameOf(row)} ${next ? 'activated' : 'deactivated'}.`, { undo: async () => { await api.patch(`${endpoint}${row.id}/`, { is_active: !next }); await load() } })
    } catch (e) {
      put(!next)
      toast(errText(e), { ok: false })
    }
  }

  const colDefs: Col<Row>[] = cols.map((k) => ({
    key: k,
    label: pretty(k),
    cell: (r) => {
      if (k === 'is_active' && typeof r.is_active === 'boolean') {
        return <button className={`adm-switch${r.is_active ? ' on' : ''}`} onClick={() => void toggleActive(r)} aria-pressed={r.is_active}
          aria-label={`${r.is_active ? 'Deactivate' : 'Activate'} ${nameOf(r)}`} title={r.is_active ? 'Active: click to deactivate' : 'Inactive: click to activate'} />
      }
      return inline?.includes(k) ? <InlineCell text={text(r, k)} value={r[k]} onCommit={(v) => setInline(r, k, v)} /> : text(r, k)
    },
    sortBy: (r) => {
      const v = r[k]
      if (typeof v === 'number') return v
      if (typeof v === 'boolean') return v ? 1 : 0
      if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
      return v === null || v === undefined ? '' : text(r, k)
    },
    csv: (r) => text(r, k),
  }))

  function openCreate() {
    const fs = createFields.length ? createFields : buildFields(items[0] ?? {}, undefined, rel)
    setFields(fs)
    setForm(Object.fromEntries(fs.map((f) => [f.key, toForm(f, undefined)])))
    setErrs({})
    setModal({ mode: 'create' })
  }
  async function openEdit(row: Row) {
    const o = await api.options<Opts>(`${endpoint}${row.id}/`).catch(() => null)
    const fs = buildFields(row, o?.actions?.PUT, rel)
    setFields(fs)
    setForm(Object.fromEntries(fs.map((f) => [f.key, toForm(f, row[f.key])])))
    setErrs({})
    setModal({ mode: 'edit', row })
  }

  // Jump-ins from the overview / quick jump (add, edit a row, apply a filter).
  useEffect(() => {
    if (!intent || intent.tab !== id || handled.current === intent.n) return
    if (intent.kind === 'filter') { // needs no data, so apply it straight away
      handled.current = intent.n
      if (intent.filter) setChip(intent.filter)
      if (intent.q !== undefined) setQ(intent.q)
      return
    }
    if (loading) return
    handled.current = intent.n
    if (intent.kind === 'new') openCreate()
    else if (intent.kind === 'edit') { const r = items.find((x) => x.id === intent.id); if (r) void openEdit(r) }
  })

  // The form counts as dirty once any field differs from what it opened with.
  const dirty = !!modal && fields.some((f) => !sameVal(form[f.key] ?? '', toForm(f, modal.mode === 'edit' ? modal.row[f.key] : undefined)))
  async function requestClose() {
    if (dirty && !(await confirm({ title: 'Discard your changes?', body: 'This form has unsaved changes.', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true }))) return
    setModal(null)
  }

  // Esc closes the form (asking first if it has changes); "n" opens a new one; "/" is handled by the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal) void requestClose()
      const t = e.target as HTMLElement
      if (e.key.toLowerCase() === 'n' && canCreate && !modal && !e.metaKey && !e.ctrlKey && !e.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) { e.preventDefault(); openCreate() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function save(e: FormEvent<HTMLFormElement> | null, again = false) {
    e?.preventDefault()
    if (!modal) return
    setErrs({})
    const edit = modal.mode === 'edit'
    const use = edit
      ? fields.filter((f) => !sameVal(form[f.key], toForm(f, modal.row[f.key])))
      : fields.filter((f) => f.kind === 'bool' || String(form[f.key]).trim() !== '')
    if (edit && !use.length) { setModal(null); return }
    const body: Raw = {}
    try {
      for (const f of use) body[f.key] = toValue(f, form[f.key])
    } catch {
      setErrs({ [use.find((f) => f.kind === 'json')?.key ?? '']: ['That is not valid JSON.'] })
      return
    }
    setBusy(true)
    try {
      if (edit) await api.patch(`${endpoint}${modal.row.id}/`, body)
      else await api.post(endpoint, body)
      if (again && !edit) {
        setForm(Object.fromEntries(fields.map((f) => [f.key, toForm(f, undefined)])))
        document.getElementById(`adm-${fields[0]?.key}`)?.focus()
      } else setModal(null)
      await load()
      toast(`${pretty(noun)} ${edit ? 'updated' : 'created'}.`)
    } catch (err) {
      if (err instanceof ApiError) { setErrs(err.fields); if (!Object.keys(err.fields).length) toast(err.message, { ok: false }) }
      else toast(errText(err), { ok: false })
    } finally {
      setBusy(false)
    }
  }

  async function remove(row: Row) {
    const ok = await confirm({ title: `Delete this ${noun}?`, body: <><b>{nameOf(row)}</b> will be removed permanently. This cannot be undone.</>, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try {
      await api.del(`${endpoint}${row.id}/`)
      await load()
      toast(`${pretty(noun)} deleted.`)
    } catch (e) {
      toast(errText(e), { ok: false })
    }
  }

  async function bulkSet(active: boolean) {
    const ids = [...sel]
    const prev = new Map(items.filter((r) => sel.has(r.id)).map((r) => [r.id, Boolean(r.is_active)] as const))
    const res = await Promise.allSettled(ids.map((i) => api.patch<Row>(`${endpoint}${i}/`, { is_active: active })))
    const ok = ids.filter((_, i) => res[i].status === 'fulfilled')
    setItems((l) => l.map((r) => (ok.includes(r.id) ? { ...r, is_active: active } : r)))
    setSel(new Set())
    const failed = ids.length - ok.length
    toast(`${ok.length} ${noun}${ok.length === 1 ? '' : 's'} ${active ? 'activated' : 'deactivated'}${failed ? `, ${failed} failed` : ''}.`, {
      ok: !failed,
      undo: ok.length ? async () => { await Promise.allSettled(ok.map((i) => api.patch(`${endpoint}${i}/`, { is_active: prev.get(i) }))); await load() } : undefined,
    })
  }

  async function bulkDelete() {
    const ids = [...sel]
    const names = items.filter((r) => sel.has(r.id)).map(nameOf)
    const ok = await confirm({
      title: `Delete ${ids.length} ${noun}${ids.length === 1 ? '' : 's'}?`,
      body: <>{names.slice(0, 5).join(', ')}{names.length > 5 ? ` and ${names.length - 5} more` : ''} will be removed permanently. Items that are in use can't be deleted; deactivate those instead.</>,
      confirmLabel: 'Delete', danger: true,
    })
    if (!ok) return
    const res = await Promise.allSettled(ids.map((i) => api.del(`${endpoint}${i}/`)))
    const failed = res.filter((r) => r.status === 'rejected').length
    setSel(new Set())
    await load()
    toast(`${ids.length - failed} deleted${failed ? `, ${failed} could not be deleted (in use — deactivate instead)` : ''}.`, { ok: !failed })
  }

  function exportCsv() {
    downloadCsv(`${noun}s.csv`, [colDefs.map((c) => c.label), ...list.map((r) => colDefs.map((c) => c.csv?.(r) ?? ''))])
  }

  const onFormKey = (e: RKey<HTMLFormElement>) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') e.currentTarget.requestSubmit() }

  return (
    <section className="adm-card">
      <div className="adm-row">
        <h2>{title}</h2>
        <div className="adm-tools">
          <input id="adm-search" className="adm-search" placeholder={`Search ${title.toLowerCase()}… ( / )`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${title}`}
            onKeyDown={(e) => { if (e.key === 'Escape') { if (q) { setQ(''); e.stopPropagation() } else e.currentTarget.blur() } }} />
          <button className="adm-btn ghost" onClick={exportCsv} disabled={!list.length}>Export CSV</button>
          {canCreate && <button className="adm-btn" onClick={openCreate}>+ Add {noun}</button>}
        </div>
      </div>

      {quick && quick.length > 0 && (
        <div className="adm-chips" role="group" aria-label="Filters">
          {[{ id: 'all', label: 'All', n: items.length }, ...quick.map((c) => ({ id: c.id, label: c.label, n: items.filter(c.test).length }))].map((c) => (
            <button key={c.id} className={`adm-fchip${chip === c.id ? ' on' : ''}`} onClick={() => setChip(c.id)}>{c.label}<b>{c.n}</b></button>
          ))}
        </div>
      )}

      {sel.size > 0 && (
        <div className="adm-bulk" role="region" aria-label="Bulk actions">
          <b>{sel.size} selected</b>
          {hasActive && <><button className="adm-btn sm ghost" onClick={() => bulkSet(true)}>Activate</button><button className="adm-btn sm ghost" onClick={() => bulkSet(false)}>Deactivate</button></>}
          {canDelete && <button className="adm-btn sm danger" onClick={bulkDelete}>Delete</button>}
          <button className="adm-link dark" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}

      {loadErr && <div className="db-alert" role="alert">{loadErr}</div>}
      <DataTable rows={list} cols={colDefs} loading={loading} sel={canDelete || hasActive ? sel : undefined} onSel={setSel}
        storageKey={id} onRow={(r) => void openEdit(r)}
        empty={<><p>{items.length ? 'No matches for these filters.' : `No ${title.toLowerCase()} yet.`}</p>
          {items.length > 0 && <button className="adm-btn ghost" onClick={() => { setQ(''); setChip('all') }}>Clear filters</button>}
          {canCreate && !items.length && <button className="adm-btn" onClick={openCreate}>+ Add the first {noun}</button>}</>}
        actions={(r) => (<>
          <button className="adm-btn sm ghost" onClick={() => void openEdit(r)}>Edit</button>
          {canDelete && <button className="adm-btn sm danger" onClick={() => void remove(r)}>Delete</button>}
        </>)} />
      {count !== null && count > items.length && <p className="adm-help">Showing the first {items.length} of {count}.</p>}

      {modal && (
        <div className="adm-modal" role="dialog" aria-label={`${modal.mode === 'edit' ? 'Edit' : 'Add'} ${noun}`} onMouseDown={(e) => { if (e.target === e.currentTarget) void requestClose() }}>
          <form className="adm-modal-card" onSubmit={save} onKeyDown={onFormKey} noValidate>
            <div className="adm-row"><h2>{modal.mode === 'edit' ? 'Edit' : 'Add'} {noun}{dirty && <small className="adm-dirty">● Unsaved changes</small>}</h2><button type="button" className="adm-x" onClick={() => void requestClose()} aria-label="Close">×</button></div>
            <div className="adm-fgrid">
              {fields.map((f) => <FieldRow key={f.key} f={f} value={form[f.key]} error={errs[f.key]} onChange={(v) => setForm({ ...form, [f.key]: v })} />)}
            </div>
            {!fields.length && <p className="adm-empty">Nothing here can be edited.</p>}
            {Object.keys(errs).filter((k) => !fields.some((f) => f.key === k)).map((k) => <div className="db-alert" key={k}>{k === 'detail' || k === '' ? '' : `${pretty(k)}: `}{errs[k].join(' ')}</div>)}
            <div className="adm-actions">
              <button className="adm-btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
              {modal.mode === 'create' && <button type="button" className="adm-btn ghost" disabled={busy} onClick={() => void save(null, true)}>Save &amp; add another</button>}
              <button type="button" className="adm-btn ghost" onClick={() => void requestClose()}>Cancel</button>
              <span className="adm-help" style={{ marginLeft: 'auto' }}>Ctrl+Enter to save · Esc to close</span>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
