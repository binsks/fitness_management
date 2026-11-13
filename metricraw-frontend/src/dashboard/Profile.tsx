import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, api } from '../api'
import type { FieldErrors } from '../api'
import { Gauge } from './charts'
import { errText } from './util'

type Raw = Record<string, unknown>
type Choice = { value: string | number; display_name: string }
type Meta = {
  type?: string; read_only?: boolean; label?: string; help_text?: string
  max_length?: number; min_value?: number; max_value?: number; choices?: Choice[]
}
type Kind = 'text' | 'textarea' | 'number' | 'date' | 'bool' | 'select' | 'json'
type Field = { key: string; label: string; kind: Kind; step?: string; min?: number; max?: number; choices?: Choice[]; maxLength?: number; help?: string }
type Val = string | boolean

const HIDDEN = /^(id|pk|user|created.*|updated.*|.*_at|.*_id)$/i
const pretty = (k: string) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

// Initials for the avatar button, from whatever name fields the profile has.
export function initialsOf(p: Raw | null): string | null {
  if (!p) return null
  const str = (k: string) => (typeof p[k] === 'string' ? (p[k] as string).trim() : '')
  const full = [str('first_name'), str('last_name')].filter(Boolean).join(' ') || str('name') || str('full_name') || str('display_name') || str('username')
  if (!full) return null
  return full.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

// Build the form from the API's own field description (OPTIONS), falling back to the shape of the data.
function buildFields(data: Raw, meta: Record<string, Meta> | undefined): Field[] {
  const keys = (meta ? Object.keys(meta).filter((k) => !meta[k].read_only) : Object.keys(data)).filter((k) => !HIDDEN.test(k))
  return keys.map((key) => {
    const m = meta?.[key] ?? {}
    const v = data[key]
    const f: Field = { key, label: m.label || pretty(key), kind: 'text', help: m.help_text, maxLength: m.max_length, min: m.min_value, max: m.max_value }
    const t = m.type ?? ''
    if (m.choices?.length) { f.kind = 'select'; f.choices = m.choices }
    else if (t === 'boolean' || typeof v === 'boolean') f.kind = 'bool'
    else if (['integer', 'float', 'decimal'].includes(t) || typeof v === 'number' || (!meta && v === null && /(^|_)(age|height|weight|days|minutes)/i.test(key))) {
      f.kind = 'number'
      f.step = t === 'integer' || (t === '' && typeof v === 'number' && Number.isInteger(v)) ? '1' : 'any'
    }
    else if (t === 'date') f.kind = 'date'
    else if (v !== null && typeof v === 'object') f.kind = 'json'
    else if ((m.max_length ?? 0) > 150 || /bio|about|notes?|description|preferences?/i.test(key)) f.kind = 'textarea'
    return f
  })
}

function toForm(f: Field, v: unknown): Val {
  if (f.kind === 'bool') return Boolean(v)
  if (v === null || v === undefined) return ''
  if (f.kind === 'json') return JSON.stringify(v, null, 2)
  return String(v)
}

function toValue(f: Field, raw: Val): unknown {
  if (f.kind === 'bool') return raw
  const s = String(raw)
  if (f.kind === 'number') return s.trim() === '' ? null : Number(s)
  if (f.kind === 'date') return s === '' ? null : s
  if (f.kind === 'select') return s === '' ? null : (f.choices?.find((c) => String(c.value) === s)?.value ?? s)
  if (f.kind === 'json') return s.trim() === '' ? null : JSON.parse(s)
  return s
}

const numFor = (d: Raw, re: RegExp): number | null => {
  const k = Object.keys(d).find((x) => re.test(x) && typeof d[x] === 'number')
  return k ? (d[k] as number) : null
}

export default function Profile({ onSaved }: { onSaved: (p: Raw) => void }) {
  const [data, setData] = useState<Raw | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [form, setForm] = useState<Record<string, Val>>({})
  const [errs, setErrs] = useState<FieldErrors>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const apply = useCallback((d: Raw, fs: Field[]) => {
    setData(d)
    setForm(Object.fromEntries(fs.map((f) => [f.key, toForm(f, d[f.key])])))
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [d, o] = await Promise.all([
          api.get<Raw>('/api/profile/'),
          api.options<{ actions?: { PUT?: Record<string, Meta>; POST?: Record<string, Meta> } }>('/api/profile/').catch(() => null),
        ])
        if (!alive) return
        const meta = o?.actions?.PUT ?? o?.actions?.POST
        const fs = buildFields(d, meta && Object.keys(meta).length ? meta : undefined)
        setFields(fs)
        apply(d, fs)
      } catch (e) {
        if (alive) setMsg({ ok: false, text: errText(e) })
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [apply])

  const changed = useMemo(
    () => (data ? fields.filter((f) => String(form[f.key]) !== String(toForm(f, data[f.key]))) : []),
    [fields, form, data],
  )

  const filled = fields.filter((f) => f.kind === 'bool' || String(form[f.key] ?? '').trim() !== '').length
  const pct = fields.length ? Math.round((filled / fields.length) * 100) : 0

  const hRaw = data ? numFor(data, /height/i) : null
  const wRaw = data ? numFor(data, /weight/i) : null
  const bmi = hRaw && wRaw ? Math.round((wRaw / Math.pow(hRaw > 3 ? hRaw / 100 : hRaw, 2)) * 10) / 10 : null
  const bmiLabel = bmi === null ? '' : bmi < 18.5 ? 'Below typical range' : bmi < 25 ? 'In typical range' : bmi < 30 ? 'Above typical range' : 'Well above typical range'

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg(null)
    setErrs({})
    if (!changed.length) return
    const body: Raw = {}
    try {
      for (const f of changed) body[f.key] = toValue(f, form[f.key])
    } catch {
      setErrs({ [changed.find((f) => f.kind === 'json')?.key ?? '']: ['That is not valid JSON.'] })
      return
    }
    setSaving(true)
    try {
      const d = await api.patch<Raw>('/api/profile/', body)
      apply(d, fields)
      onSaved(d)
      setMsg({ ok: true, text: 'Profile saved.' })
    } catch (err) {
      if (err instanceof ApiError) { setErrs(err.fields); setMsg({ ok: false, text: err.message }) }
      else setMsg({ ok: false, text: errText(err) })
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    if (data) apply(data, fields)
    setErrs({})
    setMsg(null)
  }

  if (loading) return <p className="dbx-loading">Loading your profile…</p>
  if (!data) return <div className="db-alert" role="alert">{msg?.text ?? 'Could not load your profile.'}</div>

  const ini = initialsOf(data)
  const set = (k: string, v: Val) => setForm({ ...form, [k]: v })

  return (
    <div className="dbx-prof">
      <section className="dbx-card dbx-pcard">
        <div className="dbx-bigav">{ini ?? <svg viewBox="0 0 24 24" width="44" height="44" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" /></svg>}</div>
        <h2>My profile</h2>
        <p className="dbx-label" style={{ margin: '0 0 14px' }}>Keep these details up to date so your plans fit you.</p>
        <Gauge pct={pct} label="Profile completeness" value={`${pct}%`} />
        {bmi !== null && (
          <div className="dbx-bmi">
            <p className="dbx-label">Body mass index</p>
            <div className="dbx-big sm">{bmi}</div>
            <small>{bmiLabel}. An estimate only, not medical advice.</small>
          </div>
        )}
      </section>

      <section className="dbx-card dbx-pform">
        <div className="dbx-row"><h2>Edit profile</h2>{changed.length > 0 && <span className="dbx-chg">{changed.length} unsaved change{changed.length > 1 ? 's' : ''}</span>}</div>
        <form onSubmit={save} noValidate>
          <div className="dbx-fgrid">
            {fields.map((f) => {
              const e = errs[f.key]
              const id = `pf-${f.key}`
              return (
                <div key={f.key} className={`dbx-field${e ? ' bad' : ''}${f.kind === 'textarea' || f.kind === 'json' ? ' wide' : ''}${f.kind === 'bool' ? ' bool' : ''}`}>
                  {f.kind === 'bool' ? (
                    <label className="dbx-check"><input id={id} type="checkbox" checked={Boolean(form[f.key])} onChange={(ev) => set(f.key, ev.target.checked)} /><span>{f.label}</span></label>
                  ) : (
                    <>
                      <label htmlFor={id}>{f.label}</label>
                      {f.kind === 'select' ? (
                        <select id={id} value={String(form[f.key] ?? '')} onChange={(ev) => set(f.key, ev.target.value)}>
                          <option value="">— Not set —</option>
                          {f.choices?.map((c) => <option key={String(c.value)} value={String(c.value)}>{c.display_name}</option>)}
                        </select>
                      ) : f.kind === 'textarea' || f.kind === 'json' ? (
                        <textarea id={id} rows={f.kind === 'json' ? 5 : 3} maxLength={f.maxLength} value={String(form[f.key] ?? '')} onChange={(ev) => set(f.key, ev.target.value)} />
                      ) : (
                        <input id={id} type={f.kind === 'number' ? 'number' : f.kind === 'date' ? 'date' : 'text'}
                          step={f.step} min={f.min} max={f.max} maxLength={f.maxLength}
                          value={String(form[f.key] ?? '')} onChange={(ev) => set(f.key, ev.target.value)} />
                      )}
                    </>
                  )}
                  {e ? e.map((m) => <span className="dbx-err" key={m}>{m}</span>) : f.help && <span className="dbx-help">{f.help}</span>}
                </div>
              )
            })}
          </div>
          {!fields.length && <p className="db-empty">No editable profile fields were found.</p>}
          {msg && <div className={msg.ok ? 'db-ok' : 'db-alert'} role="status" style={{ marginTop: 16, marginBottom: 0 }}>{msg.text}</div>}
          <div className="dbx-actions">
            <button className="dbx-save" disabled={saving || !changed.length}>{saving ? 'Saving…' : 'Save changes'}</button>
            <button type="button" className="dbx-ghost" onClick={reset} disabled={!changed.length || saving}>Reset</button>
          </div>
        </form>
      </section>
    </div>
  )
}
