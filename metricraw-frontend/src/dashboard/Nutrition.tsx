import { useEffect, useState } from 'react'
import { api } from '../api'
import { errText, loadWater, saveWater } from './util'

type Goal = 'lose' | 'maintain' | 'gain'
type Sex = 'male' | 'female'

const ACTIVITY: [string, number][] = [
  ['Sedentary (little exercise)', 1.2],
  ['Light (1–3 workouts a week)', 1.375],
  ['Moderate (3–5 workouts a week)', 1.55],
  ['Very active (6–7 workouts a week)', 1.725],
]
const GOALS: { id: Goal; label: string; factor: number }[] = [
  { id: 'lose', label: 'Lose weight', factor: 0.85 },
  { id: 'maintain', label: 'Maintain', factor: 1 },
  { id: 'gain', label: 'Build muscle', factor: 1.1 },
]
const MEALS: Record<Goal, [string, string][]> = {
  lose: [
    ['Breakfast', 'Veggie omelette with berries'],
    ['Lunch', 'Grilled chicken salad with chickpeas'],
    ['Dinner', 'Baked fish with steamed vegetables'],
    ['Snack', 'Greek yogurt with fruit'],
  ],
  maintain: [
    ['Breakfast', 'Oats with banana and nuts'],
    ['Lunch', 'Rice bowl with eggs or tofu and vegetables'],
    ['Dinner', 'Lentil soup with whole-grain bread'],
    ['Snack', 'Hummus with carrot and cucumber sticks'],
  ],
  gain: [
    ['Breakfast', 'Peanut butter banana smoothie with milk'],
    ['Lunch', 'Rice, chicken and avocado bowl'],
    ['Dinner', 'Pasta with lean mince and vegetables'],
    ['Snack', 'Cottage cheese with fruit and granola'],
  ],
}

export default function Nutrition({ weight }: { weight?: number }) {
  const [sex, setSex] = useState<Sex>('male')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [kg, setKg] = useState(weight ? String(weight) : '')
  const [act, setAct] = useState(1.55)
  const [goal, setGoal] = useState<Goal>('maintain')
  const [water, setWater] = useState(loadWater)
  const [tips, setTips] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    saveWater(water)
  }, [water])

  const w = Number(kg), h = Number(height), a = Number(age)
  const filled = w > 0 && h > 0 && a > 0
  let res: { kcal: number; protein: number; carbs: number; fat: number } | null = null
  if (filled && a >= 18) {
    const bmr = 10 * w + 6.25 * h - 5 * a + (sex === 'male' ? 5 : -161) // Mifflin-St Jeor
    const kcal = Math.round(bmr * act * GOALS.find((g) => g.id === goal)!.factor)
    const protein = Math.round(1.8 * w)
    const fat = Math.round((kcal * 0.25) / 9)
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
    res = { kcal, protein, carbs, fat }
  }
  const total = res ? res.protein * 4 + res.carbs * 4 + res.fat * 9 || 1 : 1

  async function loadTips() {
    setError('')
    try {
      setTips((await api.post<{ suggestions: string[] }>('/api/nutrition/suggestions/', {})).suggestions)
    } catch (e) { setError(errText(e)) }
  }

  return (
    <>
      <div className="db-grid db-two" style={{ alignItems: 'start' }}>
        <div className="db-card">
          <h3>Daily target</h3>
          <div className="db-pills">
            {GOALS.map((g) => (
              <button key={g.id} className={`db-pill${goal === g.id ? ' on' : ''}`} onClick={() => setGoal(g.id)}>{g.label}</button>
            ))}
          </div>
          <div className="db-form">
            <div className="db-two2">
              <label>Sex (for the formula)
                <select className="db-in" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                  <option value="male">Male</option><option value="female">Female</option>
                </select>
              </label>
              <label>Age<input className="db-in" type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} /></label>
            </div>
            <div className="db-two2">
              <label>Height (cm)<input className="db-in" type="number" min="0" value={height} onChange={(e) => setHeight(e.target.value)} /></label>
              <label>Weight (kg)<input className="db-in" type="number" min="0" step="0.1" value={kg} onChange={(e) => setKg(e.target.value)} /></label>
            </div>
            <label>Activity level
              <select className="db-in" value={act} onChange={(e) => setAct(Number(e.target.value))}>
                {ACTIVITY.map(([label, v]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </label>
          </div>

          <div style={{ marginTop: 18 }}>
            {!filled && <p className="db-small">Enter your age, height and weight to see your targets.</p>}
            {filled && a < 18 && <p className="db-small">These formulas are for adults (18+). Ask a doctor or dietitian for guidance.</p>}
            {res && (
              <>
                <span className="db-big">{res.kcal}</span> <span className="db-small">kcal per day</span>
                <div className="db-macros">
                  <i style={{ width: `${(res.protein * 4 / total) * 100}%`, background: '#0E5AA7' }} />
                  <i style={{ width: `${(res.carbs * 4 / total) * 100}%`, background: '#BFD9F2' }} />
                  <i style={{ width: `${(res.fat * 9 / total) * 100}%`, background: '#E8923A' }} />
                </div>
                <div className="db-row-between db-small">
                  <span>● Protein {res.protein} g</span><span>● Carbs {res.carbs} g</span><span>● Fat {res.fat} g</span>
                </div>
                {res.kcal < 1200 && (
                  <div className="db-alert" style={{ marginTop: 12 }}>
                    This target is quite low. Please talk to a doctor or dietitian before eating this little.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="db-grid">
          <div className="db-card">
            <h3>Hydration</h3>
            <div className="db-cups">
              {Array.from({ length: 8 }, (_, i) => (
                <button key={i} className={`db-cup${i < water ? ' on' : ''}`}
                  onClick={() => setWater(water === i + 1 ? i : i + 1)} aria-label={`${i + 1} glasses`} />
              ))}
            </div>
            <p className="db-small" style={{ marginBottom: 0 }}>{water} of 8 glasses today</p>
          </div>

          <div className="db-card">
            <h3>Nutrition tips</h3>
            {tips.length ? <ul className="db-tips">{tips.map((t) => <li key={t}>{t}</li>)}</ul>
              : <p className="db-sub">General tips from your coach.</p>}
            {error && <div className="db-alert">{error}</div>}
            <button className="db-btn alt sm" onClick={loadTips}>{tips.length ? 'Refresh tips' : 'Show tips'}</button>
          </div>
        </div>
      </div>

      <div className="db-card" style={{ marginTop: 18 }}>
        <h3>Meal ideas · {GOALS.find((g) => g.id === goal)!.label}</h3>
        <div className="db-meals">
          {MEALS[goal].map(([meal, idea]) => (
            <div className="db-meal" key={meal}><span className="db-chip">{meal}</span><p>{idea}</p></div>
          ))}
        </div>
      </div>
      <p className="db-small" style={{ marginTop: 14 }}>General fitness information, not medical advice.</p>
    </>
  )
}
