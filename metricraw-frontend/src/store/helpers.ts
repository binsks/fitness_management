import { API_URL } from '../api'
import type { PayMethod, Product } from '../dashboard/types'

export const imgSrc = (p: Product) =>
  p.image_url ? (p.image_url.startsWith('http') ? p.image_url : `${API_URL}${p.image_url}`) : null

export const PAY: { id: PayMethod; label: string; hint: string }[] = [
  { id: 'cod', label: 'Cash on delivery', hint: 'Pay when it arrives' },
  { id: 'upi', label: 'UPI', hint: 'Any UPI app' },
  { id: 'card', label: 'Card', hint: 'Debit or credit' },
]

export const payLabel = (id?: string) => PAY.find((p) => p.id === id)?.label ?? id ?? '—'
