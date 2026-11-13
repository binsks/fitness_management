import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { errText, fmtDate, rows } from '../dashboard/util'
import { downloadCsv } from './csv'
import DataTable from './DataTable'
import type { Col } from './DataTable'
import type { Intent } from './Crud'
import { useToast } from './toast'

type AUser = {
  id: number; username: string; email: string; first_name: string; last_name: string
  is_active: boolean; is_staff: boolean; is_superuser: boolean; date_joined: string; last_login: string | null
}
type Flag = 'is_active' | 'is_staff'

const CHIPS: { id: string; label: string; test: (u: AUser) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'active', label: 'Active', test: (u) => u.is_active },
  { id: 'inactive', label: 'Inactive', test: (u) => !u.is_active },
  { id: 'staff', label: 'Staff', test: (u) => u.is_staff && !u.is_superuser },
  { id: 'su', label: 'Superusers', test: (u) => u.is_superuser },
]

export default function Users({ meId, intent }: { meId: number; intent?: Intent | null }) {
  const toast = useToast()
  const [list, setList] = useState<AUser[]>([])
  const [q, setQ] = useState('')
  const [chip, setChip] = useState('all')
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const handled = useRef(0)

  const load = useCallback(async () => {
    try { setList(rows(await api.get<AUser[] | { results: AUser[] }>('/api/admin/users/'))); setErr('') }
    catch (e) { setErr(errText(e)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  // Jump-ins from the Ctrl K search or the overview: prefill the search / filter.
  useEffect(() => {
    if (!intent || intent.tab !== 'users' || handled.current === intent.n) return
    handled.current = intent.n
    if (intent.kind === 'filter') { if (intent.filter) setChip(intent.filter); if (intent.q !== undefined) setQ(intent.q) }
  })

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); toast(`Copied ${text}`) }
    catch { toast('Could not copy. Select the email and copy it manually.', { ok: false }) }
  }

  const locked = (u: AUser) => u.is_superuser || u.id === meId

  async function setFlag(u: AUser, key: Flag, value: boolean, quiet = false) {
    setBusy(u.id)
    try {
      const upd = await api.patch<AUser>(`/api/admin/users/${u.id}/`, { [key]: value })
      setList((l) => l.map((x) => (x.id === u.id ? upd : x)))
      if (!quiet) {
        const what = key === 'is_active' ? (value ? 'account activated' : 'account deactivated') : (value ? 'staff access granted' : 'staff access removed')
        toast(`${u.username}: ${what}.`, { undo: async () => { await setFlag(upd, key, !value, true); toast(`${u.username}: change undone.`) } })
      }
    } catch (e) {
      toast(errText(e), { ok: false })
    } finally {
      setBusy(null)
    }
  }

  async function bulk(key: Flag, value: boolean) {
    const targets = list.filter((u) => sel.has(u.id) && !locked(u) && u[key] !== value)
    if (!targets.length) { toast('Nothing to change in the selection.', { ok: false }); return }
    const res = await Promise.allSettled(targets.map((u) => api.patch<AUser>(`/api/admin/users/${u.id}/`, { [key]: value })))
    const done = targets.filter((_, i) => res[i].status === 'fulfilled')
    setList((l) => l.map((x) => (done.some((d) => d.id === x.id) ? { ...x, [key]: value } : x)))
    setSel(new Set())
    toast(`${done.length} user${done.length === 1 ? '' : 's'} updated${done.length < targets.length ? `, ${targets.length - done.length} failed` : ''}.`, {
      ok: done.length === targets.length,
      undo: done.length ? async () => { await Promise.allSettled(done.map((u) => api.patch(`/api/admin/users/${u.id}/`, { [key]: !value }))); await load() } : undefined,
    })
  }

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase()
    const test = CHIPS.find((c) => c.id === chip)?.test ?? (() => true)
    return list.filter((u) => test(u) && (!t || `${u.username} ${u.email} ${u.first_name} ${u.last_name}`.toLowerCase().includes(t)))
  }, [list, q, chip])

  const cols: Col<AUser>[] = [
    { key: 'user', label: 'User', sortBy: (u) => u.username.toLowerCase(), csv: (u) => u.username,
      cell: (u) => <><b>{u.username}</b>{(u.first_name || u.last_name) && <small className="adm-sub">{u.first_name} {u.last_name}</small>}</> },
    { key: 'email', label: 'Email', sortBy: (u) => u.email.toLowerCase(), csv: (u) => u.email, cell: (u) => (u.email ? <button className="adm-copy" title="Click to copy" onClick={() => void copy(u.email)}>{u.email}<i aria-hidden="true">⧉</i></button> : '—') },
    { key: 'joined', label: 'Joined', sortBy: (u) => u.date_joined, csv: (u) => u.date_joined, cell: (u) => fmtDate(u.date_joined) },
    { key: 'seen', label: 'Last login', sortBy: (u) => u.last_login ?? '', csv: (u) => u.last_login ?? '', cell: (u) => (u.last_login ? fmtDate(u.last_login) : 'Never') },
    { key: 'role', label: 'Role', sortBy: (u) => (u.is_superuser ? 2 : u.is_staff ? 1 : 0), csv: (u) => (u.is_superuser ? 'Superuser' : u.is_staff ? 'Staff' : 'Member'),
      cell: (u) => (u.is_superuser ? <span className="adm-chip gold">Superuser</span> : u.is_staff ? <span className="adm-chip">Staff</span> : 'Member') },
    { key: 'active', label: 'Active', sortBy: (u) => (u.is_active ? 1 : 0), csv: (u) => (u.is_active ? 'Yes' : 'No'),
      cell: (u) => <button className={`adm-switch${u.is_active ? ' on' : ''}`} disabled={locked(u) || busy === u.id} onClick={() => setFlag(u, 'is_active', !u.is_active)}
        aria-pressed={u.is_active} aria-label={`${u.is_active ? 'Deactivate' : 'Activate'} ${u.username}`} title={locked(u) ? 'This account cannot be changed here' : undefined} /> },
    { key: 'staff', label: 'Staff', csv: (u) => (u.is_staff ? 'Yes' : 'No'),
      cell: (u) => <button className="adm-btn sm ghost" disabled={locked(u) || busy === u.id} onClick={() => setFlag(u, 'is_staff', !u.is_staff)}>{u.is_staff ? 'Remove staff' : 'Make staff'}</button> },
  ]

  return (
    <section className="adm-card">
      <div className="adm-row">
        <h2>Users</h2>
        <div className="adm-tools">
          <input id="adm-search" className="adm-search" placeholder="Search users… ( / )" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users"
            onKeyDown={(e) => { if (e.key === 'Escape') { if (q) { setQ(''); e.stopPropagation() } else e.currentTarget.blur() } }} />
          <button className="adm-btn ghost" disabled={!visible.length} onClick={() => downloadCsv('users.csv', [cols.map((c) => c.label), ...visible.map((u) => cols.map((c) => c.csv?.(u) ?? ''))])}>Export CSV</button>
        </div>
      </div>
      <div className="adm-chips" role="group" aria-label="Filters">
        {CHIPS.map((c) => <button key={c.id} className={`adm-fchip${chip === c.id ? ' on' : ''}`} onClick={() => setChip(c.id)}>{c.label}<b>{list.filter(c.test).length}</b></button>)}
      </div>
      {sel.size > 0 && (
        <div className="adm-bulk" role="region" aria-label="Bulk actions">
          <b>{sel.size} selected</b>
          <button className="adm-btn sm ghost" onClick={() => bulk('is_active', true)}>Activate</button>
          <button className="adm-btn sm ghost" onClick={() => bulk('is_active', false)}>Deactivate</button>
          <button className="adm-btn sm ghost" onClick={() => bulk('is_staff', true)}>Make staff</button>
          <button className="adm-link dark" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}
      {err && <div className="db-alert" role="alert">{err}</div>}
      <DataTable rows={visible} cols={cols} loading={loading} sel={sel} onSel={setSel} storageKey="users"
        empty={<><p>No users match.</p><button className="adm-btn ghost" onClick={() => { setQ(''); setChip('all') }}>Clear filters</button></>} />
    </section>
  )
}
