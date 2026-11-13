import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { Plan, PlanDay } from './types'
import { errText } from './util'

type Props = { plan: Plan; day: PlanDay; onClose: () => void; onSaved: () => Promise<void> }
type Phase = 'run' | 'saving' | 'done' | 'error'

const CIRC = 2 * Math.PI * 54
const COLORS = ['#BFD9F2', '#8DC49A', '#E8923A', '#F4F8FC']

export default function Session({ plan, day, onClose, onSaved }: Props) {
  const exs = useMemo(() => [...day.exercises].sort((a, b) => a.order - b.order), [day])
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState<boolean[][]>(() => exs.map((e) => Array<boolean>(Math.max(1, e.sets)).fill(false)))
  const [rest, setRest] = useState(0)
  const [restMax, setRestMax] = useState(1)
  const [phase, setPhase] = useState<Phase>('run')
  const [error, setError] = useState('')
  const [bits] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.9, color: COLORS[i % 4] })))

  useEffect(() => {
    if (rest <= 0) return
    const t = setTimeout(() => setRest((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [rest])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'run') return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(exs.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, onClose, exs.length])

  const title = `${plan.name} · Day ${day.day_number}${day.name ? ` · ${day.name}` : ''}`

  if (!exs.length) {
    return (
      <div className="db-ses" role="dialog" aria-label="Workout">
        <div className="db-ses-in">
          <h2>{title}</h2>
          <p>This day has no exercises yet.</p>
          <button className="db-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  const total = done.reduce((n, r) => n + r.length, 0)
  const doneCount = done.reduce((n, r) => n + r.filter(Boolean).length, 0)
  const ex = exs[idx]
  const exDone = done[idx].every(Boolean)

  function toggle(si: number) {
    const was = done[idx][si]
    const next = done.map((r) => [...r])
    next[idx][si] = !was
    setDone(next)
    if (was) { setRest(0); return }
    const finished = next.every((r) => r.every(Boolean))
    if (ex.rest_seconds > 0 && !finished) { setRest(ex.rest_seconds); setRestMax(ex.rest_seconds) }
    else setRest(0)
  }

  async function finish() {
    setPhase('saving')
    setError('')
    try {
      // Extra keys are ignored by DRF if your WorkoutHistory model doesn't use them,
      // so this works with whichever of these names your model defines.
      await api.post('/api/workout-history/', {
        plan: plan.id, workout_plan: plan.id, workout: plan.id,
        day: day.id, workout_day: day.id,
      })
      await onSaved()
      setPhase('done')
    } catch (e) {
      setError(errText(e))
      setPhase('error')
    }
  }

  if (phase === 'done') {
    return (
      <div className="db-ses" role="dialog" aria-label="Workout complete">
        {bits.map((b, i) => <i key={i} className="db-conf" style={{ left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s` }} />)}
        <div className="db-ses-in" style={{ textAlign: 'center' }}>
          <h2 className="db-ses-h">Workout <em>complete</em></h2>
          <p>{doneCount} of {total} sets done · {title}</p>
          <button className="db-btn" onClick={onClose}>Back to dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="db-ses" role="dialog" aria-label="Workout in progress">
      <div className="db-ses-in">
        <div className="db-row-between">
          <span className="db-ses-title">{title}</span>
          <button className="db-x2" onClick={onClose} aria-label="Exit workout">×</button>
        </div>
        <div className="db-prog" aria-label={`${doneCount} of ${total} sets done`}><i style={{ width: `${(doneCount / total) * 100}%` }} /></div>

        <div className="db-ses-card" key={idx}>
          <span className="db-chip">{ex.muscle_group}</span>
          <h2 className="db-ses-h">{ex.exercise_name}</h2>
          <p className="db-ses-sub">Target: {ex.sets} × {ex.reps} reps · rest {ex.rest_seconds}s</p>
          <div className="db-sets">
            {done[idx].map((d, si) => (
              <button key={si} className={`db-set${d ? ' on' : ''}`} onClick={() => toggle(si)} aria-pressed={d}
                aria-label={`Set ${si + 1}${d ? ' done' : ''}`}>{d ? '✓' : si + 1}</button>
            ))}
          </div>
          <p className="db-ses-sub">Tap a set when you finish it.</p>

          {rest > 0 && (
            <div className="db-rest">
              <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
                <circle cx="60" cy="60" r="54" className="db-ring-bg" />
                <circle cx="60" cy="60" r="54" className="db-ring" strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - rest / restMax)} transform="rotate(-90 60 60)" />
              </svg>
              <span className="db-rest-n" aria-live="polite">{rest}s</span>
              <div className="db-btnrow" style={{ justifyContent: 'center' }}>
                <button className="db-btn alt sm db-light" onClick={() => { setRest(rest + 15); setRestMax(restMax + 15) }}>+15s</button>
                <button className="db-btn alt sm db-light" onClick={() => setRest(0)}>Skip rest</button>
              </div>
            </div>
          )}
        </div>

        <div className="db-ses-nav">
          <button className="db-btn alt db-light" disabled={idx === 0} onClick={() => { setRest(0); setIdx(idx - 1) }}>← Previous</button>
          {idx < exs.length - 1
            ? <button className={`db-btn${exDone ? ' db-glow' : ' alt db-light'}`} onClick={() => { setRest(0); setIdx(idx + 1) }}>Next exercise →</button>
            : <button className="db-btn db-glow" onClick={finish} disabled={phase === 'saving'}>{phase === 'saving' ? 'Saving…' : 'Finish workout'}</button>}
        </div>

        <div className="db-dots">
          {exs.map((e, i) => (
            <button key={e.id} className={`db-dot${i === idx ? ' on' : ''}${done[i].every(Boolean) ? ' ok' : ''}`}
              onClick={() => { setRest(0); setIdx(i) }} title={e.exercise_name} aria-label={e.exercise_name} />
          ))}
        </div>

        {phase === 'error' && (
          <div className="db-alert" role="alert">
            Couldn't save this workout: {error}
            <div className="db-btnrow" style={{ marginTop: 10 }}>
              <button className="db-btn sm" onClick={finish}>Try again</button>
              <button className="db-btn alt sm" onClick={onClose}>Close without saving</button>
            </div>
          </div>
        )}
        {phase === 'run' && idx < exs.length - 1 && (
          <button className="db-link db-lightlink" onClick={finish}>Finish early and save</button>
        )}
      </div>
    </div>
  )
}
