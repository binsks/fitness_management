// Builds edit forms from the API's own field description (an OPTIONS request), so the admin
// works with whatever fields your models have.
export type Raw = Record<string, unknown>
export type Choice = { value: string | number; display_name: string }
export type Meta = {
  type?: string; read_only?: boolean; label?: string; help_text?: string
  max_length?: number; min_value?: number; max_value?: number; choices?: Choice[]
}
export type Kind = 'text' | 'textarea' | 'number' | 'date' | 'bool' | 'select' | 'json'
export type Field = {
  key: string; label: string; kind: Kind; step?: string; min?: number; max?: number
  choices?: Choice[]; maxLength?: number; help?: string
}
export type Val = string | boolean

export const HIDDEN = /^(id|pk|user|created.*|updated.*|.*_at)$/i
export const pretty = (k: string) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

export function buildFields(sample: Raw, meta: Record<string, Meta> | undefined, relations: Record<string, Choice[]> = {}): Field[] {
  const keys = (meta ? Object.keys(meta).filter((k) => !meta[k].read_only) : Object.keys(sample)).filter((k) => !HIDDEN.test(k))
  return keys.map((key) => {
    const m = meta?.[key] ?? {}
    const v = sample[key]
    const f: Field = { key, label: m.label || pretty(key), kind: 'text', help: m.help_text, maxLength: m.max_length, min: m.min_value, max: m.max_value }
    const t = m.type ?? ''
    if (relations[key]) { f.kind = 'select'; f.choices = relations[key] }
    else if (m.choices?.length) { f.kind = 'select'; f.choices = m.choices }
    else if (t === 'boolean' || typeof v === 'boolean') f.kind = 'bool'
    else if (['integer', 'float', 'decimal'].includes(t) || typeof v === 'number') {
      f.kind = 'number'
      f.step = t === 'integer' || (t === '' && typeof v === 'number' && Number.isInteger(v)) ? '1' : 'any'
    }
    else if (t === 'date') f.kind = 'date'
    else if (v !== null && typeof v === 'object') f.kind = 'json'
    else if ((m.max_length ?? 0) > 150 || /description|instructions|notes?|bio|about/i.test(key)) f.kind = 'textarea'
    return f
  })
}

export function toForm(f: Field, v: unknown): Val {
  if (f.kind === 'bool') return Boolean(v)
  if (v === null || v === undefined) return ''
  if (f.kind === 'json') return JSON.stringify(v, null, 2)
  return String(v)
}

export function toValue(f: Field, raw: Val): unknown {
  if (f.kind === 'bool') return raw
  const s = String(raw)
  if (f.kind === 'number') return s.trim() === '' ? null : Number(s)
  if (f.kind === 'date') return s === '' ? null : s
  if (f.kind === 'select') return s === '' ? null : (f.choices?.find((c) => String(c.value) === s)?.value ?? s)
  if (f.kind === 'json') return s.trim() === '' ? null : JSON.parse(s)
  return s
}
