import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent as RKeyEvent, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { To } from 'react-router-dom'
import { clearTokens } from '../auth'
import Palette from '../dashboard/Palette'
import type { Cmd } from '../dashboard/Palette'
import { money } from '../dashboard/util'
import type { CartApi } from './useCart'
import '../store.css'

type Props = { c: CartApi; hero?: ReactNode; extra?: Cmd[]; onOrdered?: () => Promise<void> | void; children: ReactNode }

const NAV: { id: string; label: string; to: To }[] = [
  { id: 'store', label: 'Store', to: { pathname: '/store' } },
  { id: 'top', label: 'Top selling', to: { pathname: '/store', hash: '#top-selling' } },
  { id: 'orders', label: 'Orders', to: { pathname: '/store', hash: '#orders' } },
]

// Header (logo, sliding tabs, quick jump, cart, account), footer, cart drawer and toast shared by the store pages.
export default function StoreShell({ c, hero, extra = [], onOrdered, children }: Props) {
  const navigate = useNavigate()
  const loc = useLocation()
  const active = loc.hash === '#orders' ? 'orders' : loc.hash === '#top-selling' ? 'top' : 'store'
  const els = useRef<Record<string, HTMLElement | null>>({})
  const right = useRef<HTMLDivElement>(null)
  const [ind, setInd] = useState({ left: 0, width: 0 })
  const [stuck, setStuck] = useState(false)
  const [menu, setMenu] = useState(false)
  const [palette, setPalette] = useState(false)

  function logout() { clearTokens(); navigate('/login') }

  useLayoutEffect(() => {
    const place = () => {
      const el = els.current[active]
      if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [active, loc.pathname])

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); return }
      if (palette || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      if (e.key === '/') { e.preventDefault(); setPalette(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [palette])

  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => { if (!right.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  function onTabsKey(e: RKeyEvent) {
    const i = NAV.findIndex((n) => n.id === active)
    let n = -1
    if (e.key === 'ArrowRight') n = (i + 1) % NAV.length
    if (e.key === 'ArrowLeft') n = (i - 1 + NAV.length) % NAV.length
    if (n >= 0) { e.preventDefault(); navigate(NAV[n].to); els.current[NAV[n].id]?.focus() }
  }

  const cmds: Cmd[] = [
    ...NAV.map((n) => ({ id: n.id, label: `Go to ${n.label}`, run: () => navigate(n.to) })),
    { id: 'cart', label: 'Open my cart', run: () => c.setOpen(true) },
    { id: 'dash', label: 'Go to the dashboard', run: () => navigate('/dashboard') },
    { id: 'home', label: 'Go to the home page', run: () => navigate('/') },
    ...extra,
    { id: 'logout', label: 'Log out', run: logout },
  ]

  return (
    <div className="st">
      <div className="st-frame">
        <div className="st-sticky">
          <header className={`st-top${stuck ? ' stuck' : ''}`}>
            <Link to="/" className="st-logo" aria-label="MetricRaw home">
              <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#fff" /><path d="M7 23V12l4.5 6L16 9l4.5 9L25 12v11" fill="none" stroke="#0C2C52" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>Metric<em>Raw</em></span>
            </Link>

            <nav className="st-tabs" aria-label="Store sections" onKeyDown={onTabsKey}>
              <i className="st-ind" style={{ transform: `translateX(${ind.left}px)`, width: ind.width }} />
              {NAV.map((n) => (
                <Link key={n.id} to={n.to} ref={(el) => { els.current[n.id] = el }} aria-current={active === n.id ? 'page' : undefined}
                  className={`st-tab${active === n.id ? ' on' : ''}`}>{n.label}</Link>
              ))}
              <Link to="/dashboard" className="st-tab">Dashboard ↗</Link>
            </nav>

            <div className="st-right" ref={right}>
              <button className="st-icon st-searchbtn" onClick={() => setPalette(true)} aria-label="Quick jump (Ctrl K)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
                <kbd>Ctrl K</kbd>
              </button>
              <button className="st-icon" onClick={() => c.setOpen(true)} aria-label={`Cart, ${c.count} items`}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 11H6.2z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
                {c.count > 0 && <span key={c.count} className="st-badge">{c.count}</span>}
              </button>
              <button className="st-icon avatar" onClick={() => setMenu(!menu)} aria-label="Account menu" aria-expanded={menu}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" /></svg>
              </button>
              {menu && (
                <div className="st-pop" role="menu">
                  <Link to="/" onClick={() => setMenu(false)}>Home</Link>
                  <Link to="/dashboard" onClick={() => setMenu(false)}>Dashboard</Link>
                  <button onClick={logout}>Log out</button>
                </div>
              )}
            </div>
          </header>
        </div>

        {hero ?? <div className="st-spacer" />}
        {children}

        <footer className="st-foot" id="contact">
          <div className="st-footin">
            <div className="st-cols">
              <div>
                <div className="st-flogo">Metric<em>Raw</em></div>
                <p className="st-fsmall">Gear for every session. Track. Train. Transform.</p>
              </div>
              <div><h4>Shop</h4>
                <Link to="/store">All products</Link>
                <Link to={{ pathname: '/store', hash: '#top-selling' }}>Top selling</Link>
                <Link to={{ pathname: '/store', hash: '#orders' }}>Your orders</Link>
                <Link to="/dashboard">Dashboard</Link></div>
              <div><h4>Help</h4><a href="#">Shipping</a><a href="#">Returns</a><a href="#">FAQ</a></div>
              <div><h4>Contact</h4>
                <a href="mailto:hello@metricraw.com">hello@metricraw.com</a>
                <a href="tel:+910000000000">+91 00000 00000</a>
                <span className="st-fsmall">Your street address,<br />City, State, Country</span>
                <span className="st-fsmall">Mon–Sat · 9:00 AM – 6:00 PM</span></div>
            </div>
            <div className="st-fbar">
              <span>© 2026 MetricRaw. All rights reserved.</span>
              <span><a href="#">Privacy</a> <a href="#">Terms</a></span>
            </div>
          </div>
        </footer>
      </div>

      {c.toast && (
        <div className="st-toast"><div className={c.toast.ok ? 'st-ok' : 'st-bad'} role="status">{c.toast.text}</div></div>
      )}

      <Palette open={palette} onClose={() => setPalette(false)} items={cmds} />

      <div className={`st-veil${c.open ? ' on' : ''}`} onClick={() => c.setOpen(false)} />
      <aside className={`st-drawer${c.open ? ' on' : ''}`} aria-hidden={!c.open} aria-label="Shopping cart">
        <div className="st-row"><h2>Your cart</h2><button className="st-x" onClick={() => c.setOpen(false)} aria-label="Close cart">×</button></div>
        {c.items.length ? (
          <>
            <ul className="st-items">
              {c.items.map((i) => (
                <li key={i.id}>
                  <Link to={`/store/${i.product.id}`} onClick={() => c.setOpen(false)}>{i.product.name} × {i.quantity}</Link>
                  <span>{money(i.subtotal)}<button className="st-x sm" onClick={() => c.remove(i.id)} aria-label={`Remove ${i.product.name}`}>×</button></span>
                </li>
              ))}
            </ul>
            <div className="st-row"><strong>Total</strong><strong>{money(c.cart?.total)}</strong></div>
            <textarea rows={3} placeholder="Shipping address" value={c.address} onChange={(e) => c.setAddress(e.target.value)} />
            <button className="st-btn" onClick={() => c.placeOrder(onOrdered)} disabled={c.busy}>{c.busy ? 'Placing…' : 'Place order'}</button>
          </>
        ) : <p className="st-empty">Your cart is empty.</p>}
      </aside>
    </div>
  )
}
