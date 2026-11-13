import { ApiError } from '../api'
import type { HistoryItem, Plan, PlanDay } from './types'

export const CURRENCY = '$' // change to ₹, €, £ ...

export const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
export const money = (v: unknown) => `${CURRENCY}${(num(v) ?? 0).toFixed(2)}`

// DRF returns a plain list, or { results: [...] } when pagination is on.
export const rows = <T>(d: T[] | { results?: T[] } | null | undefined): T[] =>
  Array.isArray(d) ? d : d?.results ?? []

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const fmtDate = (s: string) =>
  new Date(s.length === 10 ? `${s}T00:00:00` : s).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short',
  })

export function errText(e: unknown): string {
  if (e instanceof ApiError) {
    const first = Object.entries(e.fields)[0]
    return first ? `${first[0]}: ${first[1][0]}` : e.message
  }
  return 'Something went wrong. Please try again.'
}

export const waterKey = () => `metricraw_water_${dayKey(new Date())}`
export function loadWater(): number {
  try { return Number(localStorage.getItem(waterKey())) || 0 } catch { return 0 }
}
export function saveWater(n: number) {
  try { localStorage.setItem(waterKey(), String(n)) } catch { /* storage unavailable */ }
}
const GOAL_KEY = 'metricraw_goal_weight'
export function loadGoal(): number | null {
  try { return num(localStorage.getItem(GOAL_KEY)) } catch { return null }
}
export function saveGoal(n: number | null) {
  try {
    if (n === null) localStorage.removeItem(GOAL_KEY)
    else localStorage.setItem(GOAL_KEY, String(n))
  } catch { /* storage unavailable */ }
}

export function streakOf(history: HistoryItem[]): number {
  const keys = new Set(history.map((h) => dayKey(new Date(h.completed_at))))
  const d = new Date()
  if (!keys.has(dayKey(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (keys.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}

// Newest plan and the day to do next (rotates through the plan's days).
export function pickNext(plans: Plan[], history: HistoryItem[]): { plan: Plan; day: PlanDay } | null {
  const plan = [...plans].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0]
  if (!plan) return null
  const days = [...plan.days].sort((a, b) => a.day_number - b.day_number)
  if (!days.length) return null
  return { plan, day: days[history.length % days.length] }
}
