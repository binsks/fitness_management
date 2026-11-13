import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent as RKey } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api } from '../api'
import { clearTokens, getAccess } from '../auth'
import { ConfirmProvider } from '../admin/confirm'
import Crud from '../admin/Crud'
import type { Intent, Quick } from '../admin/Crud'
import Orders from '../admin/Orders'
import Overview from '../admin/Overview'
import { loadIndex, matchIndex } from '../admin/search'
import type { Rec } from '../admin/search'
import Shortcuts from '../admin/Shortcuts'
import { ToastProvider, useToast } from '../admin/toast'
import type { GoFn, Me, Stats } from '../admin/types'
import Users from '../admin/Users'
import LogoMark from '../components/Logo'
import Palette from '../dashboard/Palette'
import type { Cmd } from '../dashboard/Palette'
import { errText } from '../dashboard/util'
import '../admin.css'

const TABS = [
  { id: 'overview', label: 'Overview' }, { id: 'users', label: 'Users' }, { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' }, { id: 'exercises', label: 'Exercises' }, { id: 'orders', label: 'Orders' },
] as const
type TabId = (typeof TABS)[number]['id']

// Defined once so the tables don't reload on every render.
const PRODUCT_RELATIONS = { category: '/api/categories/' }
const PRODUCT_COLS = ['id', 'name', 'category', 'price', 'stock', 'is_active']
const PRODUCT_QUICK: Quick[] = [
  { id: 'active', label: 'Active', test: (r) => r.is_active === true },
  { id: 'inactive', label: 'Inactive', test: (r) => r.is_active === false },
  { id: 'low', label: 'Low stock', test: (r) => r.is_active !== false && Number(r.stock) <= 5 },
]
const ACTIVE_QUICK: Quick[] = PRODUCT_QUICK.slice(0, 2)
const INLINE = ['price', 'stock']
const LIVE_KEY = 'metricraw_admin_live'
const tabFromHash = (): TabId => TABS.find((t) => t.id === window.location.hash.slice(1))?.id ?? 'overview'

export default function AdminPage() {
  return <ToastProvider><ConfirmProvider><AdminShell /></ConfirmProvider></ToastProvider>
}

function AdminShell() {
  const navigate = useNavigate()
  const toast = useToast()
  const [state, setState] = useState<'loading' | 'ok' | 'denied' | 'error'>('loading')
  const [err, setErr] = useState('')
  const [me, setMe] = useState<Me | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [updated, setUpdated] = useState(new Date())
  const [tab, setTab] = useState<TabId>(tabFromHash)
  const [intent, setIntent] = useState<Intent | null>(null)
  const [palette, setPalette] = useState(false)
  const [stuck, setStuck] = useState(false)
  const [help, setHelp] = useState(false)
  const [index, setIndex] = useState<Rec[]>([])
  const [live, setLive] = useState(() => { try { return localStorage.getItem(LIVE_KEY) === '1' } catch { return false } })
  const prevTab = useRef(tab)
  const [ind, setInd] = useState({ left: 0, width: 0 })
  const els = useRef<Record<string, HTMLElement | null>>({})
  const counter = useRef(0)

  const go: GoFn = useCallback((i) => {
    setTab(i.tab as TabId)
    setIntent({ ...i, tab: i.tab, kind: i.kind ?? 'filter', n: ++counter.current })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const refresh = useCallback(async (quiet = false) => {
    try { setStats(await api.get<Stats>('/api/admin/stats/')); setUpdated(new Date()) }
    catch (e) { setErr(errText(e)); if (!quiet) toast(errText(e), { ok: false }) }
  }, [toast])
  function toggleLive(v: boolean) {
    setLive(v)
    try { localStorage.setItem(LIVE_KEY, v ? '1' : '0') } catch { /* storage unavailable */ }
    if (v) void refresh(true)
  }

  useEffect(() => {
    if (!getAccess()) { navigate('/login'); return }
    let alive = true
    ;(async () => {
      try {
        const m = await api.get<Me>('/api/me/')
        if (!alive) return
        setMe(m)
        if (!m.is_superuser) { setState('denied'); return }
        setStats(await api.get<Stats>('/api/admin/stats/'))
        setUpdated(new Date())
        if (alive) setState('ok')
      } catch (e) {
        if (!alive) return
        if (e instanceof ApiError && e.status === 401) { clearTokens(); navigate('/login'); return }
        if (e instanceof ApiError && e.status === 403) { setState('denied'); return }
        setErr(errText(e))
        setState('error')
      }
    })()
    return () => { alive = false }
  }, [navigate])

  // The open section lives in the URL (#products), so reloads, back/forward and shared links land in the right place.
  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => { if (tabFromHash() !== tab) window.location.hash = tab }, [tab])

  // Live mode re-fetches the overview every 30 s (only while it is visible); coming back to it always refreshes.
  useEffect(() => {
    if (!live || state !== 'ok' || tab !== 'overview') return
    const t = setInterval(() => { if (!document.hidden) void refresh(true) }, 30000)
    return () => clearInterval(t)
  }, [live, state, tab, refresh])
  useEffect(() => {
    if (tab === 'overview' && prevTab.current !== 'overview' && state === 'ok') void refresh(true)
    prevTab.current = tab
  }, [tab, state, refresh])

  // Ctrl K also searches every user, product, category, exercise and order.
  useEffect(() => {
    if (!palette || state !== 'ok') return
    let alive = true
    void loadIndex().then((r) => { if (alive) setIndex(r) })
    return () => { alive = false }
  }, [palette, state])
  const records = useCallback((q: string) => matchIndex(index, q).map((r) => ({
    id: r.key, label: r.label, hint: r.hint,
    run: () => (r.tab === 'users' ? go({ tab: 'users', q: r.q }) : r.tab === 'orders' ? go({ tab: 'orders', kind: 'open', id: r.id }) : go({ tab: r.tab, kind: 'edit', id: r.id })),
  })), [index, go])

  // Sliding highlight, glass bar on scroll, and keyboard shortcuts (Ctrl K, "/" to search).
  useLayoutEffect(() => {
    const place = () => { const el = els.current[tab]; if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth }) }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [tab, state])
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); return }
      const t = e.target as HTMLElement
      if (palette || e.metaKey || e.ctrlKey || e.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      if (e.key === '/') { e.preventDefault(); document.getElementById('adm-search')?.focus() }
      if (e.key === '?') { e.preventDefault(); setHelp(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [palette])

  function onTabsKey(e: RKey) {
    const i = TABS.findIndex((t) => t.id === tab)
    let n = -1
    if (e.key === 'ArrowRight') n = (i + 1) % TABS.length
    if (e.key === 'ArrowLeft') n = (i - 1 + TABS.length) % TABS.length
    if (n >= 0) { e.preventDefault(); setTab(TABS[n].id); els.current[TABS[n].id]?.focus() }
  }
  function logout() { clearTokens(); navigate('/login') }

  if (state === 'loading') return <div className="adm adm-center"><p>Checking access…</p></div>

  if (state !== 'ok') {
    return (
      <div className="adm adm-center">
        <div className="adm-gate">
          <LogoMark dark />
          {state === 'denied' ? (
            <>
              <h1>Access denied</h1>
              <p>The admin console is only for superuser accounts{me ? `, and ${me.username} isn't one` : ''}.</p>
            </>
          ) : (
            <>
              <h1>Admin console unavailable</h1>
              <p>{err}</p>
              <p className="adm-help">Make sure the admin API from <code>admin_api.py</code> is added to your Django project.</p>
            </>
          )}
          <Link className="adm-btn" to="/dashboard">Back to dashboard</Link>
        </div>
      </div>
    )
  }

  const cmds: Cmd[] = [
    ...TABS.map((t) => ({ id: t.id, label: `Go to ${t.label}`, run: () => go({ tab: t.id }) })),
    { id: 'np', label: 'Add a product', run: () => go({ tab: 'products', kind: 'new' }) },
    { id: 'nc', label: 'Add a category', run: () => go({ tab: 'categories', kind: 'new' }) },
    { id: 'ne', label: 'Add an exercise', run: () => go({ tab: 'exercises', kind: 'new' }) },
    { id: 'low', label: 'Show low-stock products', run: () => go({ tab: 'products', kind: 'filter', filter: 'low' }) },
    { id: 'refresh', label: 'Refresh the overview', run: () => { setTab('overview'); void refresh() } },
    { id: 'live', label: live ? 'Turn off live refresh' : 'Turn on live refresh', run: () => { setTab('overview'); toggleLive(!live) } },
    { id: 'help', label: 'Keyboard shortcuts', hint: '?', run: () => setHelp(true) },
    { id: 'dash', label: 'Back to the dashboard', run: () => navigate('/dashboard') },
    { id: 'logout', label: 'Log out', run: logout },
  ]

  return (
    <div className="adm">
      <header className={`adm-bar${stuck ? ' stuck' : ''}`}>
        <Link to="/" className="adm-logo" aria-label="MetricRaw home"><LogoMark /><span>Metric<em>Raw</em></span></Link>
        <span className="adm-pill">Admin</span>
        <nav className="adm-tabs" role="tablist" aria-label="Admin sections" onKeyDown={onTabsKey}>
          <i className="adm-ind" style={{ transform: `translateX(${ind.left}px)`, width: ind.width }} />
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1} ref={(el) => { els.current[t.id] = el }}
              className={`adm-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
        <div className="adm-right">
          <button className="adm-link adm-kbd" onClick={() => setPalette(true)} aria-label="Quick jump (Ctrl K)">Search <kbd>Ctrl K</kbd></button>
          <Link className="adm-link" to="/dashboard">← Dashboard</Link>
          <button className="adm-link" onClick={logout}>Log out</button>
        </div>
      </header>

      <section className="adm-hero">
        <h1>Admin Console</h1>
        <p>Signed in as <b>{me?.username}</b> · superuser</p>
      </section>

      <main className="adm-main" key={tab}>
        {tab === 'overview' && stats && <Overview s={stats} go={go} onRefresh={() => refresh()} updated={updated} live={live} onLive={toggleLive} />}
        {tab === 'users' && me && <Users meId={me.id} intent={intent} />}
        {tab === 'products' && <Crud id="products" title="Products" noun="product" endpoint="/api/admin/products/" columns={PRODUCT_COLS} relations={PRODUCT_RELATIONS} inline={INLINE} quick={PRODUCT_QUICK} intent={intent} />}
        {tab === 'categories' && <Crud id="categories" title="Categories" noun="category" endpoint="/api/admin/categories/" intent={intent} />}
        {tab === 'exercises' && <Crud id="exercises" title="Exercises" noun="exercise" endpoint="/api/admin/exercises/" quick={ACTIVE_QUICK} intent={intent} />}
        {tab === 'orders' && <Orders intent={intent} />}
        <p className="adm-foot">Shortcuts: <kbd>Ctrl K</kbd> quick jump · <kbd>/</kbd> search · <kbd>N</kbd> add new · <kbd>Esc</kbd> close · <button className="adm-foot-link" onClick={() => setHelp(true)}><kbd>?</kbd> all shortcuts</button></p>
      </main>

      <Palette open={palette} onClose={() => setPalette(false)} items={cmds} extra={records} placeholder="Jump to a page, action or any record…" />
      {help && <Shortcuts onClose={() => setHelp(false)} />}
    </div>
  )
}
