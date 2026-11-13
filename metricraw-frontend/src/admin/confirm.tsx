import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type ConfirmOpts = { title: string; body?: ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
type Fn = (o: ConfirmOpts) => Promise<boolean>

const Ctx = createContext<Fn>(async () => false)
export const useConfirm = () => useContext(Ctx)

// Replaces window.confirm: `if (!(await confirm({ title: 'Delete?' }))) return`.
// Dangerous actions focus "Cancel" first, Esc cancels, Tab stays inside the dialog.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [cur, setCur] = useState<ConfirmOpts | null>(null)
  const pending = useRef<((v: boolean) => void) | null>(null)

  const close = useCallback((v: boolean) => {
    pending.current?.(v)
    pending.current = null
    setCur(null)
  }, [])
  const confirm = useCallback<Fn>((o) => new Promise<boolean>((resolve) => {
    pending.current?.(false)
    pending.current = resolve
    setCur(o)
  }), [])

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {cur && <Dialog o={cur} onClose={close} />}
    </Ctx.Provider>
  )
}

function Dialog({ o, onClose }: { o: ConfirmOpts; onClose: (v: boolean) => void }) {
  const cancel = useRef<HTMLButtonElement>(null)
  const ok = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ;(o.danger ? cancel : ok).current?.focus()
    // Capture phase + stopPropagation keeps page shortcuts (n, /, Esc on a form behind) from firing.
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Escape') { e.preventDefault(); onClose(false) }
      else if (e.key === 'Tab') {
        const items = [cancel.current, ok.current].filter((x): x is HTMLButtonElement => !!x)
        const i = items.indexOf(document.activeElement as HTMLButtonElement)
        e.preventDefault()
        items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); prev?.focus?.() }
  }, [o, onClose])

  return (
    <div className="adm-confirm" role="alertdialog" aria-modal="true" aria-label={o.title}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(false) }}>
      <div className="adm-confirm-card">
        <h2>{o.title}</h2>
        {o.body && <div className="adm-confirm-body">{o.body}</div>}
        <div className="adm-actions" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
          <button ref={cancel} className="adm-btn ghost" onClick={() => onClose(false)}>{o.cancelLabel ?? 'Cancel'}</button>
          <button ref={ok} className={`adm-btn${o.danger ? ' solid-danger' : ''}`} onClick={() => onClose(true)}>{o.confirmLabel ?? 'Confirm'}</button>
        </div>
      </div>
    </div>
  )
}
