import { useEffect } from 'react'

const GROUPS: { title: string; rows: [string, string][] }[] = [
  { title: 'Anywhere', rows: [['Ctrl K', 'Quick jump: pages, actions and any record'], ['/', 'Focus the search box'], ['?', 'Show or hide this sheet'], ['Esc', 'Close the open panel']] },
  { title: 'Tables', rows: [['↑ ↓  or  J K', 'Move between rows'], ['Enter', 'Open the focused row'], ['Space', 'Select the focused row'], ['Shift + click', 'Select a range of rows'], ['N', 'Add a new record']] },
  { title: 'Forms and panels', rows: [['Ctrl Enter', 'Save the form'], ['← →', 'Previous / next order in the order panel']] },
]

export default function Shortcuts({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className="adm-confirm" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="adm-confirm-card adm-short">
        <div className="adm-row"><h2>Keyboard shortcuts</h2><button className="adm-x" onClick={onClose} aria-label="Close">×</button></div>
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="adm-h3">{g.title}</h3>
            <dl>
              {g.rows.map(([k, d]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>)}
            </dl>
          </section>
        ))}
      </div>
    </div>
  )
}
