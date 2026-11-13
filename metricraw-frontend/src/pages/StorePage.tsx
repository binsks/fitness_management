import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { Order, Product, Rec } from '../dashboard/types'
import { fmtDate, money, num, rows } from '../dashboard/util'
import ProductCard from '../store/ProductCard'
import StoreShell from '../store/StoreShell'
import type { Cmd } from '../dashboard/Palette'
import { useCart } from '../store/useCart'

type Category = { id: number; name: string }
type List<T> = T[] | { results: T[] }
type Sort = 'featured' | 'low' | 'high' | 'name'

export default function StorePage() {
  const c = useCart()
  const { fail, add } = c
  const location = useLocation()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<number | null>(null)
  const [sort, setSort] = useState<Sort>('featured')
  const [products, setProducts] = useState<Product[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [recs, setRecs] = useState<Rec[]>([])
  const [top, setTop] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const loadProducts = useCallback(async () => {
    const qs = new URLSearchParams()
    if (q) qs.set('search', q)
    if (cat) qs.set('category', String(cat))
    try { setProducts(rows(await api.get<List<Product>>(`/api/products/?${qs}`))) }
    catch (e) { fail(e) }
    finally { setLoading(false) }
  }, [q, cat, fail])
  const loadOrders = useCallback(async () => {
    try { setOrders(rows(await api.get<List<Order>>('/api/orders/'))) } catch { /* shown empty */ }
  }, [])
  const loadRecs = useCallback(async () => {
    try { setRecs(rows(await api.get<List<Rec>>('/api/recommendations/'))) } catch { /* shown empty */ }
  }, [])

  useEffect(() => {
    api.get<List<Category>>('/api/categories/').then((d) => setCats(rows(d))).catch(() => undefined)
    api.get<List<Product>>('/api/products/top-selling/')
      .then((d) => setTop(rows(d).slice(0, 4))).catch(() => undefined)
    loadOrders(); loadRecs()
  }, [loadOrders, loadRecs])

  useEffect(() => {
    const t = setTimeout(loadProducts, 250)
    return () => clearTimeout(t)
  }, [loadProducts])

  // Jump to #top-selling / #orders when arriving from another store page.
  useEffect(() => {
    if (loading || !location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [loading, location.hash])

  const shown = useMemo(() => {
    const list = [...products]
    if (sort === 'low') list.sort((a, b) => (num(a.price) ?? 0) - (num(b.price) ?? 0))
    if (sort === 'high') list.sort((a, b) => (num(b.price) ?? 0) - (num(a.price) ?? 0))
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [products, sort])

  // Real best sellers come from /api/products/top-selling/. Until that exists, show the first products as 'Featured'.
  const topReal = top.length > 0
  const topList = topReal ? top : !q && !cat ? products.slice(0, 4) : []

  async function getRecs() {
    try { await api.post('/api/recommendations/', {}); await loadRecs() } catch (e) { fail(e) }
  }

  const extra: Cmd[] = products.map((p) => ({ id: `p${p.id}`, label: `Open ${p.name}`, hint: money(p.price), run: () => navigate(`/store/${p.id}`) }))

  const hero = (
    <section className="st-hero">
      <div className="st-herobg" /><div className="st-shade" />
      <div className="st-herotxt">
        <span className="st-eyebrow">MetricRaw Store</span>
        <h1>Gear for every <em>session</em></h1>
        <p>Everything for your plan, one tap away.</p>
        <input className="st-search" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
      </div>
    </section>
  )

  return (
    <StoreShell c={c} hero={hero} extra={extra} onOrdered={async () => { await Promise.all([loadOrders(), loadProducts()]) }}>
      <main className="st-main">
        {topList.length > 0 && (
          <section className="st-top4" id="top-selling">
            <h2>{topReal ? 'Top' : 'Featured'} <em>{topReal ? 'selling' : 'picks'}</em></h2>
            <div className="st-grid">
              {topList.map((p, i) => <ProductCard key={p.id} p={p} i={i} rank={topReal ? i + 1 : undefined} added={c.added === p.id} onAdd={add} />)}
            </div>
          </section>
        )}

        <div className="st-toolbar">
          <div className="st-chips">
            <button className={`st-pill${cat === null ? ' on' : ''}`} onClick={() => setCat(null)}>All</button>
            {cats.map((ct) => (
              <button key={ct.id} className={`st-pill${cat === ct.id ? ' on' : ''}`} onClick={() => setCat(ct.id)}>{ct.name}</button>
            ))}
          </div>
          <label className="st-sort">Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="featured">Featured</option><option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option><option value="name">Name</option>
            </select>
          </label>
        </div>

        {loading ? <p className="st-empty">Loading products…</p> : (
          <div className="st-grid">
            {shown.map((p, i) => <ProductCard key={p.id} p={p} i={i} added={c.added === p.id} onAdd={add} />)}
          </div>
        )}
        {!loading && !shown.length && <p className="st-empty">No products found.</p>}

        <section className="st-section">
          <div className="st-row"><h2>Recommended <em>for you</em></h2>
            <button className="st-btn alt" onClick={getRecs}>Get recommendations</button></div>
          {recs.length ? (
            <div className="st-recs">
              {recs.map((r) => (
                <div className="st-rec" key={r.id}>
                  <strong>{r.product.name}</strong> <span className="st-small">{money(r.product.price)}</span>
                  <p className="st-small">{r.reason}</p>
                  <button className="st-btn alt" disabled={r.product.stock < 1} onClick={() => add(r.product)}>Add to cart</button>
                </div>
              ))}
            </div>
          ) : <p className="st-empty">No recommendations yet.</p>}
        </section>

        <section className="st-section" id="orders">
          <h2>Your <em>orders</em></h2>
          {orders.length ? (
            <div className="st-scroll"><table>
              <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>{orders.map((o) => (
                <tr key={o.id}><td>#{o.id}</td><td>{fmtDate(o.created_at)}</td>
                  <td>{o.items.map((i) => `${i.product_name} × ${i.quantity}`).join(', ')}</td>
                  <td><span className="st-chip">{o.status}</span></td><td>{money(o.total)}</td></tr>
              ))}</tbody>
            </table></div>
          ) : <p className="st-empty">No orders yet.</p>}
        </section>
      </main>
    </StoreShell>
  )
}
