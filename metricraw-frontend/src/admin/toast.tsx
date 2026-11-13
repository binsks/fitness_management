import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type Item = { id: number; text: string; ok: boolean; undo?: () => Promise<void> | void }
type Fn = (text: string, opts?: { ok?: boolean; undo?: () => Promise<void> | void }) => void

const Ctx = createContext<Fn>(() => undefined)
export const useToast = () => useContext(Ctx)

// Bottom-of-screen messages. Ones with an Undo button stay a little longer.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Item[]>([])
  const n = useRef(0)
  const dismiss = useCallback((id: number) => setList((l) => l.filter((t) => t.id !== id)), [])
  const toast = useCallback<Fn>((text, opts) => {
    const id = ++n.current
    setList((l) => [...l.slice(-3), { id, text, ok: opts?.ok ?? true, undo: opts?.undo }])
    setTimeout(() => dismiss(id), opts?.undo ? 7000 : 4000)
  }, [dismiss])
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="adm-toasts" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`adm-toast ${t.ok ? 'ok' : 'bad'}`}>
            <span>{t.text}</span>
            {t.undo && <button onClick={async () => { dismiss(t.id); await t.undo?.() }}>Undo</button>}
            <button className="x" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
