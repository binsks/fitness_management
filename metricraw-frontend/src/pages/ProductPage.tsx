import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, api } from '../api'
import type { Product } from '../dashboard/types'
import { money, rows } from '../dashboard/util'
import { imgSrc } from '../store/helpers'
import ProductCard from '../store/ProductCard'
import StoreShell from '../store/StoreShell'
import { useCart } from '../store/useCart'

type List<T> = T[] | { results: T[] }
type State = 'loading' | 'ok' | 'missing'

export default function ProductPage() {
  const { id } = useParams()
  const c = useCart()
  const { fail } = c
  const [p, setP] = useState<Product | null>(null)
  const [state, setState] = useState<State>('loading')
  const [related, setRelated] = useState<Product[]>([])
  const [qty, setQty] = useState(1)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)

  const load = () =>
    api.get<Product>(`/api/products/${id}/`).then((d) => { setP(d); setState('ok') }).catch((e) => {
      if (e instanceof ApiError && e.status === 404) setState('missing')
      else fail(e)
    })

  useEffect(() => {
    setState('loading')
    setQty(1)
    window.scrollTo(0, 0)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fail])

  useEffect(() => {
    if (!p) return
    const qs = p.category ? `?category=${p.category}` : ''
    api.get<List<Product>>(`/api/products/${qs}`)
      .then((d) => setRelated(rows(d).filter((x) => x.id !== p.id).slice(0, 4)))
      .catch(() => undefined)
  }, [p])

  const inCart = p ? c.items.find((i) => i.product.id === p.id)?.quantity ?? 0 : 0
  const room = p ? Math.max(0, p.stock - inCart) : 0
  const q = Math.min(Math.max(qty, 1), Math.max(room, 1))
  const src = p ? imgSrc(p) : null

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }
  const zoomStyle = zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined

  async function add() {
    if (p) { await c.add(p, q); await load() }
  }
  async function buyNow() {
    if (p && (await c.add(p, q))) { await load(); c.setOpen(true) }
  }

  if (state !== 'ok' || !p) {
    return (
      <StoreShell c={c}>
        <main className="st-main">
          <p className="st-empty">{state === 'missing' ? 'Product not found.' : 'Loading product…'}</p>
          <Link to="/store" className="st-btn alt" style={{ display: 'inline-block', textDecoration: 'none' }}>← Back to store</Link>
        </main>
      </StoreShell>
    )
  }

  const stockClass = p.stock < 1 ? 'out' : p.stock <= 5 ? 'low' : ''
  const stockText = p.stock < 1 ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock'

  return (
    <StoreShell c={c} onOrdered={load} extra={[{ id: 'add', label: `Add ${p.name} to my cart`, run: () => { void add() } }]}>
      <main className="st-main">
        <nav className="st-crumb" aria-label="Breadcrumb">
          <Link to="/store">Store</Link> / {p.category_name ? <>{p.category_name} / </> : null}<span>{p.name}</span>
        </nav>

        <div className="st-pd">
          <div className="st-gal" onMouseMove={onMove} onMouseLeave={() => setZoom(null)}>
            {src ? <img src={src} alt={p.name} style={zoomStyle} /> : <span style={zoomStyle}>{p.name.charAt(0)}</span>}
          </div>

          <div className="st-info">
            <span className="st-chip">{p.category_name || 'Gear'}</span>
            <h1>{p.name}</h1>
            <div className="st-price">{money(p.price)}</div>
            <span className="st-stock"><i className={`st-dot ${stockClass}`} />{stockText}</span>
            <p className="st-desc">{p.description || 'No description has been added for this product yet.'}</p>

            <div className="st-buy">
              <div className="st-qty">
                <button onClick={() => setQty(q - 1)} disabled={q <= 1} aria-label="Decrease quantity">−</button>
                <span aria-live="polite">{q}</span>
                <button onClick={() => setQty(q + 1)} disabled={q >= room} aria-label="Increase quantity">+</button>
              </div>
              <button className="st-btn" onClick={add} disabled={room < 1 || c.added === p.id}>
                {c.added === p.id ? 'Added ✓' : p.stock < 1 ? 'Sold out' : room < 1 ? 'Max in cart' : `Add to cart · ${money(Number(p.price) * q)}`}
              </button>
              <button className="st-btn alt" onClick={buyNow} disabled={room < 1}>Buy now</button>
            </div>
            {inCart > 0 && <span className="st-small">{inCart} already in your cart.</span>}

            <table className="st-spec">
              <tbody>
                <tr><th>Category</th><td>{p.category_name || '—'}</td></tr>
                <tr><th>Price</th><td>{money(p.price)}</td></tr>
                <tr><th>Availability</th><td>{stockText}</td></tr>
                <tr><th>Product ID</th><td>#{p.id}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {related.length > 0 && (
          <section className="st-section">
            <h2>You may also <em>like</em></h2>
            <div className="st-grid">
              {related.map((r, i) => <ProductCard key={r.id} p={r} i={i} added={c.added === r.id} onAdd={(x) => c.add(x)} />)}
            </div>
          </section>
        )}
      </main>
    </StoreShell>
  )
}
