import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, login } from '../api'
import { setTokens } from '../auth'
import LogoMark from '../components/Logo'
import '../auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }
    setLoading(true)
    try {
      const tokens = await login(username.trim(), password)
      setTokens(tokens.access, tokens.refresh)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="au">
      <aside className="au-side">
        <div className="au-bg login" />
        <div className="au-shade" />
        <Link to="/" className="au-logo" aria-label="MetricRaw home"><LogoMark /><span>Metric<em>Raw</em></span></Link>
        <div className="au-quote">
          <h2 className="au-h">Track. Train.<br /><em>Transform.</em></h2>
          <p>Pick up where you left off. Your plan, progress and gear are waiting.</p>
        </div>
      </aside>

      <main className="au-main">
        <form className="au-card" onSubmit={onSubmit} noValidate>
          <Link to="/" className="au-mlogo" aria-label="MetricRaw home"><LogoMark dark /><span>Metric<em>Raw</em></span></Link>
          <h1 className="au-h">Welcome <em>back</em></h1>
          <p className="au-sub">Log in to continue your training.</p>

          {error && <div className="au-alert" role="alert">{error}</div>}

          <div className="au-field">
            <label htmlFor="username">Username</label>
            <input id="username" autoComplete="username" value={username}
              onChange={(e) => setUsername(e.target.value)} />
          </div>

          <div className="au-field">
            <label htmlFor="password">Password</label>
            <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="au-show" onClick={() => setShow(!show)}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>

          <button className="au-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Log in'}
          </button>
          <p className="au-alt">New to MetricRaw? <Link to="/register">Create an account</Link></p>
          <p className="au-alt"><Link to="/admin/login">Administrator sign in</Link></p>
        </form>
      </main>
    </div>
  )
}
