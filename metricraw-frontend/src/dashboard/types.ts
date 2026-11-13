export type PlanExercise = {
  id: number; exercise: number; exercise_name: string; muscle_group: string
  order: number; sets: number; reps: number; rest_seconds: number
}
export type PlanDay = { id: number; day_number: number; name: string; exercises: PlanExercise[] }
export type FitnessGoal = {
  id: number; goal: string; days_per_week: number; session_minutes: number
  active: boolean; created_at: string
}
export type Plan = {
  id: number; name: string; goal: string | number | null; days_per_week: number
  session_minutes: number; source: string; created_at: string; days: PlanDay[]
}
export type HistoryItem = { id: number; completed_at: string }
export type ProgressRow = {
  date: string; weight_kg: number | string | null; body_fat: number | string | null
  waist_cm: number | string | null; chest_cm: number | string | null
}
export type Product = {
  id: number; name: string; price: string | number; stock: number
  category_name?: string; description?: string; image?: string | null; sold?: number; category?: number
}
export type CartItem = { id: number; product: Product; quantity: number; subtotal: string | number }
export type Cart = { id: number; items: CartItem[]; total: string | number }
export type OrderItem = { id: number; product_name: string; unit_price: string | number; quantity: number }
export type Order = {
  id: number; status: string; total: string | number; shipping_address: string
  created_at: string; items: OrderItem[]
}
export type Rec = { id: number; product: Product; reason: string }
