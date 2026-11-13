import { API_URL } from '../api'
import type { Product } from '../dashboard/types'

export const imgSrc = (p: Product) =>
  p.image ? (p.image.startsWith('http') ? p.image : `${API_URL}${p.image}`) : null
