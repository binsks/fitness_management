export type Me = { id: number; username: string; email: string; is_superuser: boolean; is_staff: boolean }
export type Stats = {
  users: { total: number; active: number; staff: number; new_7d: number }
  orders: { total: number; last_7d: number; revenue: string | number; by_status: { status: string; count: number }[] }
  products: { total: number; active: number; out_of_stock: number; low_stock: { id: number; name: string; stock: number }[] }
  activity: { plans: number; workouts_completed: number; completed_7d: number; progress_entries: number }
  signups: { date: string; count: number }[]
  recent_orders: { id: number; username: string; total: string | number; status: string; created_at: string }[]
}
export type GoFn = (i: { tab: string; kind?: 'new' | 'edit' | 'open' | 'filter'; id?: number; filter?: string; q?: string }) => void
