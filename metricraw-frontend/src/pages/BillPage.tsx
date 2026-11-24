import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, api } from '../api'
import type { Order } from '../dashboard/types'
import BillDoc from '../store/BillDoc'
import StoreShell from '../store/StoreShell'
import { useCart } from '../store/useCart'

export default function BillPage() {
  const { id } = useParams()
  const c = useCart()
  const { fail } = c
  const [o, setO] = useState<Order | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    setO(null)
    setMissing(false)
    api.get<Order>(`/api/orders/${id}/`)
      .then(setO)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setMissing(true)
        else fail(e)
      })
  }, [id, fail])

  return (
    <StoreShell c={c}>
      <main className="st-main st-billpage">
        <div className="st-bill-actions">
          <Link to={{ pathname: '/store', hash: '#orders' }} className="st-btn alt">← Orders</Link>
          {o && <button className="st-btn" onClick={() => window.print()}>Print bill</button>}
        </div>
        {o ? <BillDoc o={o} /> : (
          <p className="st-empty">{missing ? 'Bill not found.' : 'Loading bill…'}</p>
        )}
      </main>
    </StoreShell>
  )
}
