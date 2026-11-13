import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent as RKeyEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api } from '../api'
import { clearTokens, getAccess } from '../auth'
import Overview from '../dashboard/Overview'
import Workouts from '../dashboard/Workouts'
import Nutrition from '../dashboard/Nutrition'
import ProgressTab from '../dashboard/ProgressTab'
import Coach from '../dashboard/Coach'
import Session from '../dashboard/Session'
import Profile, { initialsOf } from '../dashboard/Profile'
import Palette from '../dashboard/Palette'
import type { Cmd } from '../dashboard/Palette'
import type { HistoryItem, Plan, PlanDay, ProgressRow } from '../dashboard/types'
import { dayKey, num, pickNext, rows, streakOf } from '../dashboard/util'
import '../dashboard.css'

const TABS = [
  { id: 'overview', label: 'Overview', h1: ['Better Fitness.', 'Stronger Results.'] },
  { id: 'workouts', label: 'Workouts', h1: ['Plan Smarter.', 'Train Harder.'] },
  { id: 'nutrition', label: 'Nutrition', h1: ['Fuel Better.', 'Recover Faster.'] },
  { id: 'progress', label: 'Progress', h1: ['Track Progress.', 'See Results.'] },
  { id: 'coach', label: 'AI Coach', h1: ['Ask Anything.', 'Train Smarter.'] },
  { id: 'profile', label: 'Profile', h1: ['Your Profile.', 'Your Goals.'] },
] as const
// Profile has no tab pill: it opens from the account menu or quick jump.
const VISIBLE = TABS.filter((t) => t.id !== 'profile')
type TabId = (typeof TABS)[number]['id']
type List<T> = T[] | { results: T[] }
type Sess = { plan: Plan; day: PlanDay } | null
type Raw = Record<string, unknown>
type Me = { username: string; is_superuser: boolean }

export default function Dashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>('overview')
  const [plans, setPlans] = useState<Plan[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState<Sess>(null)
  const [profile, setProfile] = useState<Raw | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [pop, setPop] = useState<'bell' | 'user' | null>(null)
  const right = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLElement | null>(null)
  const tabEls = useRef<Record<string, HTMLElement | null>>({})
  const [ind, setInd] = useState({ left: 0, width: 0 })
  const [stuck, setStuck] = useState(false)
  const [palette, setPalette] = useState(false)
  const [seen, setSeen] = useState('')

  const load = useCallback(async () => {
    try {
      const [p, h, s, pr, mr] = await Promise.all([
        api.get<List<Plan>>('/api/workouts/'),
        api.get<List<HistoryItem>>('/api/workout-history/'),
        api.get<{ entries: ProgressRow[] }>('/api/progress/summary/'),
        api.get<Raw>('/api/profile/').catch(() => null),
        api.get<Me>('/api/me/').catch(() => null),
      ])
      setProfile(pr)
      setMe(mr)
      setPlans(rows(p))
      setHistory(rows(h))
      setProgress(s.entries ?? [])
      setError('')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearTokens()
        navigate('/login')
        return
      }
      setError(e instanceof ApiError ? e.message : 'Could not load your data.')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (!getAccess()) { navigate('/login'); return }
    load()
  }, [load, navigate])

  // Keyboard shortcuts: Ctrl/Cmd+K or "/" opens quick jump, 1-5 switch tabs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (session) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); return }
      if (palette || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      if (e.key === '/') { e.preventDefault(); setPalette(true); return }
      const i = Number(e.key) - 1
      if (i >= 0 && i < VISIBLE.length) setTab(VISIBLE[i].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session, palette])

  // Navbar picks up a glass background once the page is scrolled.
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Sliding highlight under the active tab.
  useLayoutEffect(() => {
    const place = () => {
      const el = tabEls.current[tab]
      setInd(el ? { left: el.offsetLeft, width: el.offsetWidth } : { left: 0, width: 0 })
    }
    place()
    tabEls.current[tab]?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [tab])

  function onTabsKey(e: RKeyEvent) {
    const i = VISIBLE.findIndex((t) => t.id === tab)
    let n = -1
    if (e.key === 'ArrowRight') n = (i + 1) % VISIBLE.length
    if (e.key === 'ArrowLeft') n = (i - 1 + VISIBLE.length) % VISIBLE.length
    if (e.key === 'Home') n = 0
    if (e.key === 'End') n = VISIBLE.length - 1
    if (n >= 0) {
      e.preventDefault()
      setTab(VISIBLE[n].id)
      tabEls.current[VISIBLE[n].id]?.focus()
    }
  }

  // Close the bell / profile popovers when clicking elsewhere.
  useEffect(() => {
    if (!pop) return
    const close = (e: MouseEvent) => { if (!right.current?.contains(e.target as Node)) setPop(null) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [pop])

  function logout() {
    clearTokens()
    navigate('/login')
  }

  const current = TABS.find((t) => t.id === tab)!
  const picked = pickNext(plans, history)
  const todayKey = dayKey(new Date())
  const workedToday = history.some((h) => dayKey(new Date(h.completed_at)) === todayKey)
  const loggedToday = progress.some((r) => r.date === todayKey && num(r.weight_kg) !== null)
  const dots: Record<string, boolean> = loading ? {} : { workouts: !!picked && !workedToday, progress: !loggedToday }
  const notes: string[] = []
  if (!loading) {
    if (!picked) notes.push('Generate your first workout plan.')
    else notes.push(`Next up: ${picked.plan.name} · ${picked.day.name || `Day ${picked.day.day_number}`}.`)
    if (!loggedToday) notes.push("You haven't logged your weight today.")
    const st = streakOf(history)
    if (st > 0) notes.push(`You're on a ${st}-day streak. Keep it going!`)
  }

  const sig = notes.join('|')
  const cmds: Cmd[] = [
    ...VISIBLE.map((t, i) => ({ id: t.id, label: `Go to ${t.label}`, hint: String(i + 1), run: () => setTab(t.id) })),
    { id: 'profile', label: 'Edit my profile', run: () => setTab('profile') },
    ...(picked ? [{ id: 'start', label: "Start today's workout", run: () => setSession(picked) }] : []),
    { id: 'plan', label: 'Generate a workout plan', run: () => setTab('workouts') },
    { id: 'weight', label: "Log today's weight", run: () => setTab('progress') },
    { id: 'store', label: 'Open the store', run: () => navigate('/store') },
    ...(me?.is_superuser ? [{ id: 'admin', label: 'Open the admin console', run: () => navigate('/admin') }] : []),
    { id: 'home', label: 'Go to the home page', run: () => navigate('/') },
    { id: 'logout', label: 'Log out', run: logout },
  ]

  return (
    <div className="dbx">
      <div className="dbx-frame">
        <div className="dbx-sticky">
        <header className={`dbx-bar${stuck ? ' stuck' : ''}`}>
          <Link to="/" className="dbx-logo" aria-label="MetricRaw home">
            <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#fff" /><path d="M7 23V12l4.5 6L16 9l4.5 9L25 12v11" fill="none" stroke="#0C2C52" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>Metric<em>Raw</em></span>
          </Link>

          <nav className="dbx-tabs" role="tablist" aria-label="Dashboard sections" ref={tabsRef} onKeyDown={onTabsKey}>
            <i className="dbx-ind" style={{ transform: `translateX(${ind.left}px)`, width: ind.width }} />
            {VISIBLE.map((t, i) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1}
                ref={(el) => { tabEls.current[t.id] = el }} title={`${t.label} (${i + 1})`}
                className={`dbx-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}{dots[t.id] && <i className="dbx-tdot" aria-label="Needs attention" />}
              </button>
            ))}
            <Link to="/store" className="dbx-tab">Store ↗</Link>
          </nav>

          <div className="dbx-right" ref={right}>
            <button className="dbx-icon dbx-search" onClick={() => setPalette(true)} aria-label="Quick jump (Ctrl K)">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
              <kbd>Ctrl K</kbd>
            </button>
            <button className="dbx-icon" onClick={() => { setPop(pop === 'bell' ? null : 'bell'); setSeen(sig) }} aria-label="Notifications" aria-expanded={pop === 'bell'}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
              {notes.length > 0 && seen !== sig && <i className="dbx-dot" />}
            </button>
            <button className="dbx-icon avatar" onClick={() => setPop(pop === 'user' ? null : 'user')} aria-label="Account menu" aria-expanded={pop === 'user'}>
              {initialsOf(profile) ?? (me ? me.username.slice(0, 2).toUpperCase() : null) ?? <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" /></svg>}
            </button>
            {pop === 'bell' && (
              <div className="dbx-pop" role="menu">
                <strong>Notifications</strong>
                {notes.length ? notes.map((n) => <p key={n}>{n}</p>) : <p>You're all caught up.</p>}
              </div>
            )}
            {pop === 'user' && (
              <div className="dbx-pop" role="menu">
                <button onClick={() => { setTab('profile'); setPop(null) }}>My profile</button>
                {me?.is_superuser && <Link to="/admin" onClick={() => setPop(null)}>Admin console</Link>}
                <Link to="/" onClick={() => setPop(null)}>Home</Link>
                <Link to="/store" onClick={() => setPop(null)}>Store</Link>
                <button onClick={logout}>Log out</button>
              </div>
            )}
          </div>
        </header>
        </div>

        <section className={`dbx-hero${tab === 'overview' ? ' tall' : ''}`}>
          <div className="dbx-herobg" /><div className="dbx-shade" />
          <div className="dbx-herotxt" key={tab}>
            <h1>{current.h1[0]}<br />{current.h1[1]}</h1>
            {tab === 'overview' && (
              <>
                <p>Track your workouts, monitor your progress and improve your fitness with data-driven insights.</p>
                <button className="dbx-cta" onClick={() => (picked ? setSession(picked) : setTab('workouts'))}>
                  {picked ? "Start today's workout" : 'Generate my plan'}
                </button>
              </>
            )}
          </div>
        </section>

        <main className="dbx-main">
          {error && <div className="db-alert" role="alert">{error} <button className="db-link" onClick={load}>Retry</button></div>}
          {loading ? <p className="dbx-loading">Loading your dashboard…</p> : (
            <div key={tab} className="dbx-view">
              {tab === 'overview' && <Overview plans={plans} history={history} progress={progress} goTo={(t) => setTab(t as TabId)}
                onStart={(plan, day) => setSession({ plan, day })} reload={load} />}
              {tab === 'workouts' && <Workouts plans={plans} reload={load} onStart={(plan, day) => setSession({ plan, day })} />}
              {tab === 'nutrition' && <Nutrition weight={[...progress].reverse().map((r) => num(r.weight_kg)).find((v) => v !== null) ?? undefined} />}
              {tab === 'progress' && <ProgressTab rows={progress} reload={load} />}
              {tab === 'coach' && <Coach />}
              {tab === 'profile' && <Profile onSaved={setProfile} />}
            </div>
          )}
        </main>
      </div>

      <Palette open={palette} onClose={() => setPalette(false)} items={cmds} />

      {session && (
        <Session plan={session.plan} day={session.day} onClose={() => setSession(null)} onSaved={load} />
      )}
    </div>
  )
}
