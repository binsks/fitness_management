import { Link } from 'react-router-dom'
import type { Product } from '../dashboard/types'
import { money } from '../dashboard/util'
import { imgSrc } from './helpers'

type Props = { p: Product; i?: number; rank?: number; added: boolean; onAdd: (p: Product) => void }

export default function ProductCard({ p, i = 0, rank, added, onAdd }: Props) {
  const src = imgSrc(p)
  return (
    <div className="st-card" style={{ animationDelay: `${Math.min(i, 12) * 0.05}s` }}>
      <Link to={`/store/${p.id}`} className="st-media" aria-label={`View ${p.name}`}>
        {src ? <img src={src} alt="" loading="lazy" /> : <span>{p.name.charAt(0)}</span>}
        {rank && <b className="st-rank">#{rank}</b>}
        {p.stock > 0 && p.stock <= 5 && <em className="st-low">Only {p.stock} left</em>}
      </Link>
      <div className="st-body">
        <span className="st-chip">{p.category_name || 'Gear'}</span>
        <h3><Link to={`/store/${p.id}`}>{p.name}</Link></h3>
        {rank && p.sold ? <span className="st-small">{p.sold} sold</span> : null}
        <div className="st-row"><strong>{money(p.price)}</strong>
          <span className="st-small">{p.stock > 0 ? 'In stock' : 'Out of stock'}</span></div>
        <button className={`st-btn${added ? ' done' : ''}`} disabled={p.stock < 1} onClick={() => onAdd(p)}>
          {added ? 'Added ✓' : p.stock < 1 ? 'Sold out' : 'Add to cart'}
        </button>
      </div>
    </div>
  )
}
