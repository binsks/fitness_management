import { useEffect, useState } from 'react'
import { api } from '../api'
import type { FitnessGoal, Plan, PlanDay } from './types'
import { errText, rows } from './util'

type Props = { plans: Plan[]; reload: () => Promise<void>; onStart: (plan: Plan, day: PlanDay) => void }

const GOALS = [
  { id: 'muscle_gain', label: 'Muscle Gain' },
  { id: 'fat_loss', label: 'Fat Loss' },
  { id: 'strength', label: 'Strength' },
  { id: 'endurance', label: 'Endurance' },
  { id: 'general_fitness', label: 'General Fitness' },
]

const DAYS = [2, 3, 4, 5, 6]
const DURATIONS = [30, 45, 60, 90]

export default function Workouts({ plans, reload, onStart }: Props) {
  const sorted = [...plans].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
  const [open, setOpen] = useState<number | null>(sorted[0]?.id ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeGoal, setActiveGoal] = useState<FitnessGoal | null>(null)

  const [selectedGoal, setSelectedGoal] = useState('muscle_gain')
  const [selectedDays, setSelectedDays] = useState(4)
  const [selectedMins, setSelectedMins] = useState(60)
  const [showConfig, setShowConfig] = useState(false)

  useEffect(() => {
    let alive = true
    api.get<FitnessGoal[] | { results: FitnessGoal[] }>('/api/goals/')
      .then((res) => {
        if (!alive) return
        const list = rows(res)
        const act = list.find((g) => g.active) || list[0] || null
        if (act) {
          setActiveGoal(act)
          setSelectedGoal(act.goal)
          setSelectedDays(act.days_per_week)
          setSelectedMins(act.session_minutes)
        }
      })
      .catch(() => undefined)
    return () => { alive = false }
  }, [])

  async function generate() {
    setBusy(true)
    setError('')
    try {
      const plan = await api.post<Plan>('/api/workouts/generate/', {
        goal: selectedGoal,
        days_per_week: selectedDays,
        session_minutes: selectedMins,
      })
      // Update local active goal display
      setActiveGoal({
        id: (plan.goal as number) || 0,
        goal: selectedGoal,
        days_per_week: selectedDays,
        session_minutes: selectedMins,
        active: true,
        created_at: new Date().toISOString(),
      })
      await reload()
      setOpen(plan.id)
      setShowConfig(false)
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const activeLabel = GOALS.find((g) => g.id === (activeGoal?.goal || selectedGoal))?.label || 'General Fitness'

  return (
    <>
      <div className="db-row-between" style={{ marginBottom: 18 }}>
        <div>
          <p className="db-sub" style={{ margin: '0 0 6px' }}>Plans built from your fitness goal.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="db-chip" style={{ background: '#0E5AA7', color: '#fff', padding: '4px 12px', borderRadius: 999 }}>
              Goal: {activeLabel} · {selectedDays}d/wk · {selectedMins}m
            </span>
            <button
              className="db-btn alt sm"
              style={{ padding: '4px 12px', fontSize: 13 }}
              onClick={() => setShowConfig((s) => !s)}
            >
              {showConfig ? 'Close setup' : 'Customize goal'}
            </button>
          </div>
        </div>
        <button className="db-btn" onClick={generate} disabled={busy}>
          {busy ? 'Generating…' : 'Generate new plan'}
        </button>
      </div>

      {showConfig && (
        <div className="db-card" style={{ marginBottom: 18, border: '1.5px solid #0E5AA7' }}>
          <h4 style={{ margin: '0 0 12px' }}>Choose Your Training Goal</h4>
          <div style={{ marginBottom: 14 }}>
            <p className="db-small" style={{ margin: '0 0 8px', fontWeight: 600 }}>Goal Type:</p>
            <div className="db-pills" style={{ margin: 0 }}>
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  className={`db-pill${selectedGoal === g.id ? ' on' : ''}`}
                  onClick={() => setSelectedGoal(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 14 }}>
            <div>
              <p className="db-small" style={{ margin: '0 0 8px', fontWeight: 600 }}>Days per week:</p>
              <div className="db-pills" style={{ margin: 0 }}>
                {DAYS.map((d) => (
                  <button
                    key={d}
                    className={`db-pill${selectedDays === d ? ' on' : ''}`}
                    onClick={() => setSelectedDays(d)}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="db-small" style={{ margin: '0 0 8px', fontWeight: 600 }}>Session length:</p>
              <div className="db-pills" style={{ margin: 0 }}>
                {DURATIONS.map((m) => (
                  <button
                    key={m}
                    className={`db-pill${selectedMins === m ? ' on' : ''}`}
                    onClick={() => setSelectedMins(m)}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button className="db-btn sm" onClick={generate} disabled={busy}>
            {busy ? 'Generating…' : `Generate ${activeLabel} Plan`}
          </button>
        </div>
      )}

      {error && <div className="db-alert" role="alert">{error}</div>}
      {!sorted.length && <div className="db-card"><p className="db-empty">No plans yet. Generate your first one.</p></div>}

      <div className="db-grid">
        {sorted.map((p) => (
          <div className="db-card" key={p.id}>
            <button className="db-plan-head" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id}>
              <span>
                <strong>{p.name}</strong>
                <span className="db-chips">
                  <span className="db-chip">{p.days_per_week} days/week</span>
                  <span className="db-chip">{p.session_minutes} min</span>
                  <span className="db-chip">{p.source}</span>
                </span>
              </span>
              <span className="db-caret">{open === p.id ? '–' : '+'}</span>
            </button>
            {open === p.id && (
              <div className="db-days">
                {[...p.days].sort((a, b) => a.day_number - b.day_number).map((d) => (
                  <div key={d.id} className="db-day">
                    <div className="db-row-between">
                      <h4>Day {d.day_number}{d.name ? ` · ${d.name}` : ''}</h4>
                      <button className="db-btn sm" onClick={() => onStart(p, d)}>Start workout</button>
                    </div>
                    <div className="db-scroll">
                      <table className="db-table">
                        <thead><tr><th>Exercise</th><th>Muscle</th><th>Sets × reps</th><th>Rest</th></tr></thead>
                        <tbody>
                          {[...d.exercises].sort((a, b) => a.order - b.order).map((e) => (
                            <tr key={e.id}>
                              <td>{e.exercise_name}</td><td>{e.muscle_group}</td>
                              <td>{e.sets} × {e.reps}</td><td>{e.rest_seconds}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
