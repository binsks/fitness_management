import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL, ApiError, api, login } from '../api'
import { clearTokens, getAccess, setTokens } from '../auth'
import LogoMark from '../components/Logo'
import type { Me } from '../admin/types'
import '../admin.css'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If already signed in as a superuser, jump directly to the admin console.
  useEffect(() => {
    if (!getAccess()) return
    let alive = true
    api.get<Me>('/api/me/')
      .then((m) => {
        if (alive && m.is_superuser) {
          navigate('/admin', { replace: true })
        }
      })
      .catch(() => {
        // Stale or invalid token - user can sign in fresh
      })
    return () => { alive = false }
  }, [navigate])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const trimmed = username.trim()
    if (!trimmed || !password) {
      setError('Enter your administrator username and password.')
      return
    }

    setLoading(true)
    try {
      // 1. Authenticate with credentials
      const tokens = await login(trimmed, password)

      // 2. Immediately verify administrator (superuser) authorization
      const meRes = await fetch(`${API_URL}/api/me/`, {
        headers: { Authorization: `Bearer ${tokens.access}` },
      })

      if (!meRes.ok) {
        throw new Error('Unable to verify administrator authorization.')
      }

      const me = (await meRes.json()) as Me
      if (!me.is_superuser) {
        clearTokens()
        setError(`Access denied. Account "${trimmed}" does not have administrator privileges.`)
        return
      }

      // 3. User is verified superuser -> save tokens and enter admin console
      setTokens(tokens.access, tokens.refresh)
      navigate('/admin')
    } catch (err) {
      clearTokens()
      if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Login failed. Please check your credentials and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="adm adm-login-wrap">
      <div className="adm-login-card">
        <div className="adm-login-top">
          <Link to="/" className="adm-logo" aria-label="MetricRaw home">
            <LogoMark dark />
            <span>Metric<em>Raw</em></span>
          </Link>
          <span className="adm-pill">Admin Console</span>
        </div>

        <div className="adm-login-badge">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Staff &amp; Superuser Portal</span>
        </div>

        <div className="adm-login-header">
          <h1>Admin Sign In</h1>
          <p>Restricted access. Sign in with superuser credentials to manage products, users, orders, and system settings.</p>
        </div>

        {error && (
          <div className="adm-login-alert" role="alert">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form className="adm-login-form" onSubmit={onSubmit} noValidate>
          <div className="adm-login-field">
            <label htmlFor="admin-username">Admin Username</label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter superuser username"
              required
            />
          </div>

          <div className="adm-login-field">
            <div className="adm-login-label-row">
              <label htmlFor="admin-password">Password</label>
              <button
                type="button"
                className="adm-login-toggle"
                onClick={() => setShow(!show)}
                tabIndex={-1}
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="adm-login-pw-wrap">
              <input
                id="admin-password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button className="adm-btn adm-login-btn" type="submit" disabled={loading}>
            {loading ? (
              <span className="adm-login-spin-wrap">
                <i className="adm-login-spinner" /> Verifying Access…
              </span>
            ) : (
              'Sign In to Admin Console'
            )}
          </button>
        </form>

        <div className="adm-login-foot">
          <Link to="/" className="adm-login-link">← Return to Store / Home</Link>
          <span className="adm-login-sep">·</span>
          <Link to="/login" className="adm-login-link">Client Login</Link>
        </div>
      </div>
    </div>
  )
}
