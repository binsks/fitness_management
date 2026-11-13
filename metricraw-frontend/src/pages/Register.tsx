import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, login, register } from '../api'
import type { FieldErrors } from '../api'
import { setTokens } from '../auth'
import LogoMark from '../components/Logo'
import '../auth.css'

const empty = {
  first_name: '', last_name: '', username: '', email: '', password: '', password2: '',
}
type Form = typeof empty

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>(empty)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<FieldErrors>({})

  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })

  function Field(props: {
    name: keyof Form; label: string; type?: string; auto?: string; hint?: string
  }) {
    const { name, label, type = 'text', auto, hint } = props
    const errs = fields[name]
    const isPw = name === 'password' || name === 'password2'
    return (
      <div className={`au-field${errs ? ' bad' : ''}`}>
        <label htmlFor={name}>{label}</label>
        <input id={name} type={isPw && show ? 'text' : type} autoComplete={auto}
          value={form[name]} onChange={set(name)} />
        {name === 'password' && (
          <button type="button" className="au-show" onClick={() => setShow(!show)}>
            {show ? 'Hide' : 'Show'}
          </button>
        )}
        {errs ? errs.map((m) => <span className="au-err" key={m}>{m}</span>)
          : hint && <span className="au-hint">{hint}</span>}
      </div>
    )
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const local: FieldErrors = {}
    if (!form.username.trim()) local.username = ['Choose a username.']
    if (!form.email.trim()) local.email = ['Enter your email.']
    if (!form.password) local.password = ['Choose a password.']
    if (form.password !== form.password2) local.password2 = ['Passwords do not match.']
    if (Object.keys(local).length) {
      setFields(local)
      return
    }
    setFields({})
    setLoading(true)
    try {
      await register({ ...form, username: form.username.trim(), email: form.email.trim() })
      try {
        const tokens = await login(form.username.trim(), form.password)
        setTokens(tokens.access, tokens.refresh)
        navigate('/dashboard')
      } catch {
        navigate('/login') // account was created; just log in manually
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields)
        setError(err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="au">
      <aside className="au-side">
        <div className="au-bg register" />
        <div className="au-shade" />
        <Link to="/" className="au-logo" aria-label="MetricRaw home"><LogoMark /><span>Metric<em>Raw</em></span></Link>
        <div className="au-quote">
          <h2 className="au-h">Start your <em>journey</em></h2>
          <p>Create a free account to build your plan, track progress and shop gear.</p>
        </div>
      </aside>

      <main className="au-main">
        <form className="au-card" onSubmit={onSubmit} noValidate>
          <Link to="/" className="au-mlogo" aria-label="MetricRaw home"><LogoMark dark /><span>Metric<em>Raw</em></span></Link>
          <h1 className="au-h">Create your <em>account</em></h1>
          <p className="au-sub">It only takes a minute.</p>

          {error && <div className="au-alert" role="alert">{error}</div>}

          <div className="au-row">
            {Field({ name: 'first_name', label: 'First name', auto: 'given-name' })}
            {Field({ name: 'last_name', label: 'Last name', auto: 'family-name' })}
          </div>
          {Field({ name: 'username', label: 'Username', auto: 'username' })}
          {Field({ name: 'email', label: 'Email', type: 'email', auto: 'email' })}
          {Field({ name: 'password', label: 'Password', type: 'password', auto: 'new-password',
            hint: 'Use 8+ characters and avoid common passwords.' })}
          {Field({ name: 'password2', label: 'Confirm password', type: 'password', auto: 'new-password' })}

          <button className="au-btn" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          <p className="au-alt">Already have an account? <Link to="/login">Log in</Link></p>
        </form>
      </main>
    </div>
  )
}
