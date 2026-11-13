import { api } from '../api'
import { rows } from '../dashboard/util'

export type Rec = { key: string; tab: string; id: number; label: string; hint: string; text: string; q?: string }
type R = Record<string, unknown>
const list = (url: string) => api.get<R[] | { results: R[] }>(url).then((d) => rows<R>(d)).catch(() => [] as R[])
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))

// One flat, searchable list of everything in the admin, for the Ctrl K palette.
export async function loadIndex(): Promise<Rec[]> {
  const [users, products, categories, exercises, orders] = await Promise.all([
    list('/api/admin/users/'), list('/api/admin/products/'), list('/api/admin/categories/'),
    list('/api/admin/exercises/'), list('/api/admin/orders/'),
  ])
  const out: Rec[] = []
  for (const u of users) {
    const name = [s(u.first_name), s(u.last_name)].filter(Boolean).join(' ')
    out.push({ key: `user-${u.id}`, tab: 'users', id: Number(u.id), hint: 'User', q: s(u.username),
      label: `${s(u.username)}${u.email ? ` · ${s(u.email)}` : ''}`, text: `${s(u.username)} ${s(u.email)} ${name}`.toLowerCase() })
  }
  for (const p of products) out.push({ key: `product-${p.id}`, tab: 'products', id: Number(p.id), hint: 'Product', label: s(p.name), text: `${s(p.name)} ${s(p.description)}`.toLowerCase() })
  for (const c of categories) out.push({ key: `category-${c.id}`, tab: 'categories', id: Number(c.id), hint: 'Category', label: s(c.name), text: s(c.name).toLowerCase() })
  for (const x of exercises) out.push({ key: `exercise-${x.id}`, tab: 'exercises', id: Number(x.id), hint: 'Exercise', label: s(x.name), text: `${s(x.name)} ${s(x.muscle_group)}`.toLowerCase() })
  for (const o of orders) out.push({ key: `order-${o.id}`, tab: 'orders', id: Number(o.id), hint: 'Order', label: `Order #${s(o.id)} · ${s(o.username)}`, text: `order ${s(o.id)} #${s(o.id)} ${s(o.username)} ${s(o.status)}`.toLowerCase() })
  return out
}

export function matchIndex(index: Rec[], q: string, limit = 10): Rec[] {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length || q.trim().length < 2) return []
  return index.filter((r) => words.every((w) => r.text.includes(w))).slice(0, limit)
}
