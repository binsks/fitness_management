import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { HistoryItem, Plan, PlanDay, ProgressRow } from './types'
import { CountUp, Gauge, LineChart, PairBars } from './charts'
import { dayKey, errText, fmtDate, loadGoal, loadWater, num, pickNext, saveWater, streakOf } from './util'

type Props = {
  plans: Plan[]; history: HistoryItem[]; progress: ProgressRow[]
  goTo: (tab: string) => void
  onStart: (plan: Plan, day: PlanDay) => void
  reload: () => Promise<void>
}

const RANGES = [
  { label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }, { label: 'All time', days: 0 },
]
const DAY = 864e5
const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function Overview({ plans, history, progress, goTo, onStart, reload }: Props) {
  const [range, setRange] = useState(30)
  const [qw, setQw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [water, setWater] = useState(loadWater)

  const times = history.map((h) => +new Date(h.completed_at))
  const now = Date.now()
  const count = (from: number, to: number) => times.filter((t) => t >= from && t < to).length
  const last7 = count(now - 7 * DAY, now + DAY)
  const prev7 = count(now - 14 * DAY, now - 7 * DAY)
  const delta = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null
  const streak = streakOf(history)

  const picked = pickNext(plans, history)
  const dpw = picked?.plan.days_per_week ?? 0

  // 8 weeks, oldest first (weeks start on Monday).
  const mon = new Date()
  mon.setHours(0, 0, 0, 0)
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(mon)
    start.setDate(start.getDate() - (7 - i) * 7)
    const s = +start
    return {
      label: start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      planned: dpw,
      done: count(s, s + 7 * DAY),
    }
  })
  const weekDone = weeks[weeks.length - 1].done
  const activeDays = new Set(times.filter((t) => t >= now - 7 * DAY).map((t) => dayKey(new Date(t)))).size

  const cutoff = range ? now - range * DAY : 0
  const weights = progress
    .filter((p) => +new Date(`${p.date}T00:00:00`) >= cutoff)
    .map((p) => ({ label: fmtDate(p.date), value: num(p.weight_kg) }))
    .filter((p): p is { label: string; value: number } => p.value !== null)
  const all = progress.map((p) => num(p.weight_kg)).filter((v): v is number => v !== null)
  const latest = all[all.length - 1]
  const diff = all.length > 1 ? Math.round((all[all.length - 1] - all[all.length - 2]) * 10) / 10 : null

  async function quickLog(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const v = Number(qw)
    if (!(v > 0)) { setMsg({ ok: false, text: 'Enter your weight in kg.' }); return }
    setBusy(true)
    setMsg(null)
    try {
      await api.post('/api/progress/', { date: dayKey(new Date()), weight_kg: v })
      setQw('')
      setMsg({ ok: true, text: 'Weight logged.' })
      await reload()
    } catch (err) {
      setMsg({ ok: false, text: errText(err) })
    } finally {
      setBusy(false)
    }
  }

  const exercises = picked ? [...picked.day.exercises].sort((a, b) => a.order - b.order).slice(0, 4) : []

  return (
    <div className="dbx-grid">
      <section className="dbx-card dbx-trend">
        <div className="dbx-row">
          <h2>Weight Trend</h2>
          <select className="dbx-select" value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Range">
            {RANGES.map((r) => <option key={r.label} value={r.days}>{r.label}</option>)}
          </select>
        </div>
        <p className="dbx-label">Latest weight</p>
        <div className="dbx-big">
          {latest !== undefined ? latest : '—'}<small> kg</small>
          {diff !== null && (
            <span className={`dbx-delta ${diff <= 0 ? 'up' : 'down'}`}>{diff <= 0 ? '↓' : '↑'} {Math.abs(diff)} kg <em>vs previous entry</em></span>
          )}
        </div>
        <LineChart data={weights} unit=" kg" goal={loadGoal()} />
        <form className="dbx-qlog" onSubmit={quickLog}>
          <input type="number" step="0.1" min="0" placeholder="Log today's weight (kg)" value={qw}
            onChange={(e) => setQw(e.target.value)} aria-label="Today's weight in kg" />
          <button disabled={busy}>{busy ? 'Saving…' : 'Log'}</button>
        </form>
        {msg && <div className={msg.ok ? 'db-ok' : 'db-alert'} style={{ marginTop: 10, marginBottom: 0 }}>{msg.text}</div>}
      </section>

      <section className="dbx-card dbx-goals">
        <div className="dbx-row">
          <h2>Workouts</h2>
          <span className="dbx-legend"><i className="plan" />Planned <i className="done" />Completed</span>
        </div>
        <div className="dbx-stats2">
          <div>
            <p className="dbx-label">Total workouts</p>
            <div className="dbx-big sm"><CountUp to={history.length} />
              {delta !== null && <span className={`dbx-delta ${delta >= 0 ? 'up' : 'down'}`}>{delta >= 0 ? '↑' : '↓'} {delta >= 0 ? '+' : ''}{delta}% <em>vs previous 7 days</em></span>}
            </div>
          </div>
          <div>
            <p className="dbx-label">Day streak</p>
            <div className="dbx-big sm"><CountUp to={streak} /><small> days</small></div>
          </div>
        </div>
        <PairBars items={weeks} />
      </section>

      <section className="dbx-card dbx-gauges">
        <Gauge pct={dpw ? (weekDone / dpw) * 100 : 0} label="Weekly goal" value={dpw ? `${Math.min(100, Math.round((weekDone / dpw) * 100))}%` : '—'} onClick={() => goTo('workouts')} hint="Open workouts" />
        <Gauge pct={(water / 8) * 100} label="Hydration" value={`${water}/8`} hint="Click to add a glass"
          onClick={() => { const v = water >= 8 ? 0 : water + 1; setWater(v); saveWater(v) }} />
        <Gauge pct={(activeDays / 7) * 100} label="Consistency" value={`${Math.round((activeDays / 7) * 100)}%`} onClick={() => goTo('progress')} hint="Active days in the last 7" />
      </section>

      <section className="dbx-card dbx-players">
        <div className="dbx-row">
          <h2>Up Next</h2>
          {picked
            ? <button className="dbx-ghost" onClick={() => onStart(picked.plan, picked.day)}>Start workout <span aria-hidden="true">↗</span></button>
            : <button className="dbx-ghost" onClick={() => goTo('workouts')}>Generate plan <span aria-hidden="true">↗</span></button>}
        </div>
        {picked ? (
          <>
            <p className="dbx-label" style={{ margin: '0 0 12px' }}>{picked.plan.name} · {picked.day.name || `Day ${picked.day.day_number}`}</p>
            <div className="dbx-people">
              {exercises.map((e) => (
                <button className="dbx-person" key={e.id} onClick={() => onStart(picked.plan, picked.day)} aria-label={`Start workout, ${e.exercise_name}`}>
                  <span className="dbx-avatar">{initials(e.exercise_name)}</span>
                  <strong>{e.exercise_name}</strong>
                  <small>{e.muscle_group}</small>
                  <span className="dbx-prow"><b>{e.sets} × {e.reps}</b><em>↑ rest {e.rest_seconds}s</em></span>
                  <small>Sets × reps</small>
                </button>
              ))}
            </div>
          </>
        ) : <p className="db-empty">You don't have a workout plan yet. Generate one to see your next session here.</p>}
      </section>
    </div>
  )
}
