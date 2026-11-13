import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, api } from '../api'
import { clearTokens, getAccess } from '../auth'
import type { Cart, Order, Product } from '../dashboard/types'
import { errText } from '../dashboard/util'

export type Toast = { ok: boolean; text: string } | null

// Shared cart + toast + drawer state used by every store page.
export function useCart() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<Cart | null>(null)
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [added, setAdded] = useState<number | null>(null)

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      clearTokens()
      navigate('/login')
      return
    }
    setToast({ ok: false, text: errText(e) })
  }, [navigate])

  const loadCart = useCallback(async () => {
    try { setCart(await api.get<Cart>('/api/cart/')) } catch (e) { fail(e) }
  }, [fail])

  useEffect(() => {
    if (!getAccess()) { navigate('/login'); return }
    loadCart()
  }, [navigate, loadCart])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function add(p: Product, qty = 1): Promise<boolean> {
    try {
      setCart(await api.post<Cart>('/api/cart/items/', { product_id: p.id, quantity: qty }))
      setAdded(p.id)
      setTimeout(() => setAdded(null), 1200)
      setToast({ ok: true, text: `${qty > 1 ? `${qty} × ` : ''}${p.name} added to your cart.` })
      return true
    } catch (e) { fail(e); return false }
  }

  async function remove(id: number) {
    try { await api.del(`/api/cart/items/${id}/`); await loadCart() } catch (e) { fail(e) }
  }

  async function placeOrder(onSuccess?: () => Promise<void> | void) {
    if (!address.trim()) { setToast({ ok: false, text: 'Enter a shipping address.' }); return }
    setBusy(true)
    try {
      await api.post<Order>('/api/orders/create/', { shipping_address: address.trim() })
      setAddress('')
      setOpen(false)
      setToast({ ok: true, text: 'Order placed. Thank you!' })
      await Promise.all([loadCart(), onSuccess?.()])
    } catch (e) { fail(e) }
    finally { setBusy(false) }
  }

  const items = cart?.items ?? []
  const count = items.reduce((n, i) => n + i.quantity, 0)
  return { cart, items, count, open, setOpen, address, setAddress, busy, toast, added, add, remove, placeOrder, fail }
}

export type CartApi = ReturnType<typeof useCart>
