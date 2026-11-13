import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as RKeyEvent } from 'react'

export type Cmd = { id: string; label: string; hint?: string; run: () => void }
// `extra` adds results that depend on what was typed (e.g. records found by the admin search).
type Props = { open: boolean; onClose: () => void; items: Cmd[]; extra?: (q: string) => Cmd[]; placeholder?: string }

// Quick-jump palette (Ctrl/Cmd + K). Type to filter, arrows to move, Enter to run.
export default function Palette({ open, onClose, items, extra, placeholder }: Props) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const ul = useRef<HTMLUListElement>(null)

  const list = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const base = items.filter((i) => words.every((w) => i.label.toLowerCase().includes(w)))
    return [...base, ...(extra?.(q) ?? [])].slice(0, 40)
  }, [q, items, extra])

  useEffect(() => {
    if (open) {
      setQ('')
      setIdx(0)
      const t = setTimeout(() => input.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])
  useEffect(() => { setIdx(0) }, [q])
  // Keep the highlighted row visible when arrowing through a long list.
  useEffect(() => { ul.current?.querySelector('li.on')?.scrollIntoView({ block: 'nearest' }) }, [idx, list])

  if (!open) return null

  function onKey(e: RKeyEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(list.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { const c = list[idx]; if (c) { onClose(); c.run() } }
    else if (e.key === 'Escape') onClose()
  }

  return (
    <div className="dbx-pal" role="dialog" aria-label="Quick jump" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dbx-pal-card">
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
          placeholder={placeholder ?? 'Jump to a page or action…'} aria-label="Search pages and actions" />
        {list.length ? (
          <ul ref={ul} role="listbox">
            {list.map((c, i) => (
              <li key={c.id} className={i === idx ? 'on' : ''} role="option" aria-selected={i === idx}>
                <button onMouseEnter={() => setIdx(i)} onClick={() => { onClose(); c.run() }}>
                  <span>{c.label}</span>{c.hint && <small>{c.hint}</small>}
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="empty">No matches.</p>}
      </div>
    </div>
  )
}
