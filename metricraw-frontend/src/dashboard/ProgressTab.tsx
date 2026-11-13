import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { ProgressRow } from './types'
import { LineChart } from './charts'
import { dayKey, errText, fmtDate, loadGoal, num, saveGoal } from './util'

const keys = ['weight_kg', 'body_fat', 'waist_cm', 'chest_cm'] as const
const labels: Record<(typeof keys)[number], string> = {
  weight_kg: 'Weight (kg)', body_fat: 'Body fat (%)', waist_cm: 'Waist (cm)', chest_cm: 'Chest (cm)',
}
const RANGES: { label: string; days: number }[] = [
  { label: '7 days', days: 7 }, { label: '30 days', days: 30 }, { label: 'All', days: 0 },
]

export default function ProgressTab({ rows, reload }: { rows: ProgressRow[]; reload: () => Promise<void> }) {
  const [form, setForm] = useState<Record<string, string>>({ date: dayKey(new Date()), weight_kg: '', body_fat: '', waist_cm: '', chest_cm: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [range, setRange] = useState(0)
  const [goal, setGoal] = useState<number | null>(loadGoal)
  const [goalIn, setGoalIn] = useState(goal !== null ? String(goal) : '')

  const cutoff = range ? Date.now() - range * 864e5 : 0
  const weights = rows
    .filter((r) => +new Date(`${r.date}T00:00:00`) >= cutoff)
    .map((r) => ({ label: fmtDate(r.date), value: num(r.weight_kg) }))
    .filter((p): p is { label: string; value: number } => p.value !== null)
  const allW = rows.map((r) => num(r.weight_kg)).filter((v): v is number => v !== null)
  const lastW = allW[allW.length - 1]
  const toGo = goal !== null && lastW !== undefined ? Math.round((goal - lastW) * 10) / 10 : null

  function applyGoal() {
    const v = num(goalIn)
    const next = v !== null && v > 0 ? v : null
    setGoal(next)
    saveGoal(next)
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg(null)
    const body: Record<string, unknown> = { date: form.date }
    for (const k of keys) if (form[k] !== '') body[k] = Number(form[k])
    if (Object.keys(body).length === 1) {
      setMsg({ ok: false, text: 'Enter at least one measurement.' })
      return
    }
    setBusy(true)
    try {
      await api.post('/api/progress/', body)
      await reload()
      setForm({ ...form, weight_kg: '', body_fat: '', waist_cm: '', chest_cm: '' })
      setMsg({ ok: true, text: 'Entry saved.' })
    } catch (err) {
      setMsg({ ok: false, text: errText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="db-grid db-two">
      <div className="db-card">
        <h3>Log an entry</h3>
        <form onSubmit={submit} className="db-form">
          <label>Date<input className="db-in" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          {keys.map((k) => (
            <label key={k}>{labels[k]}
              <input className="db-in" type="number" step="0.1" min="0" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
          {msg && <div className={msg.ok ? 'db-ok' : 'db-alert'}>{msg.text}</div>}
          <button className="db-btn" disabled={busy}>{busy ? 'Saving…' : 'Save entry'}</button>
        </form>
      </div>

      <div className="db-card">
        <div className="db-row-between">
          <h3>Weight over time</h3>
          <div className="db-pills" style={{ marginBottom: 12 }}>
            {RANGES.map((r) => (
              <button key={r.label} className={`db-pill${range === r.days ? ' on' : ''}`} onClick={() => setRange(r.days)}>{r.label}</button>
            ))}
          </div>
        </div>
        <LineChart data={weights} unit=" kg" goal={goal} />
        <p className="db-small" style={{ margin: '4px 0 12px' }}>Hover or drag across the chart to see each entry.</p>
        <div className="db-qlog">
          <input className="db-in" type="number" step="0.1" min="0" placeholder="Target weight (kg)" value={goalIn}
            onChange={(e) => setGoalIn(e.target.value)} aria-label="Target weight in kg" />
          <button className="db-btn alt sm" onClick={applyGoal}>Set target weight</button>
        </div>
        {toGo !== null && (
          <p className="db-small" style={{ margin: '10px 0 0' }}>
            {toGo === 0 ? 'You reached your goal!' : `${Math.abs(toGo)} kg ${toGo < 0 ? 'to lose' : 'to gain'} to reach your goal.`}
          </p>
        )}
      </div>

      <div className="db-card" style={{ gridColumn: '1 / -1' }}>
        <h3>History</h3>
        {rows.length ? (
          <div className="db-scroll">
            <table className="db-table">
              <thead><tr><th>Date</th>{keys.map((k) => <th key={k}>{labels[k]}</th>)}</tr></thead>
              <tbody>
                {[...rows].reverse().map((r, i) => (
                  <tr key={i}><td>{fmtDate(r.date)}</td>{keys.map((k) => <td key={k}>{r[k] ?? '—'}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="db-empty">Nothing logged yet.</p>}
      </div>
    </div>
  )
}
