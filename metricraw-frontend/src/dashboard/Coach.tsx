import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import { errText } from './util'

const QUICK = [
  'Plan my week',
  'Explain progressive overload',
  'How much protein do I need?',
  'Tips for muscle recovery',
  'Deadlift form tips',
]

type Msg = { role: 'user' | 'assistant'; content: string }

export default function Coach() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi! I'm your MetricRaw AI Coach, powered by Gemini. Ask me about workouts, nutrition, technique, or recovery." },
  ])
  const [convId, setConvId] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [tips, setTips] = useState<string[]>([])
  const [error, setError] = useState('')
  const end = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // Load existing chat history and nutrition suggestions on mount
  useEffect(() => {
    let alive = true
    api.get<{ conversation_id: number | null; messages: Msg[] }>('/api/ai/chat/')
      .then((res) => {
        if (!alive) return
        if (res.conversation_id && res.messages?.length) {
          setConvId(res.conversation_id)
          setMessages(res.messages)
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoadingHistory(false)
      })

    api.post<{ suggestions: string[] }>('/api/nutrition/suggestions/', {})
      .then((res) => {
        if (alive && res.suggestions) setTips(res.suggestions)
      })
      .catch(() => undefined)

    return () => { alive = false }
  }, [])

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void sendText(text.trim())
  }

  async function sendText(msg: string) {
    if (!msg || sending) return
    setText('')
    setError('')
    setMessages((m) => [...m, { role: 'user', content: msg }])
    setSending(true)
    try {
      const r = await api.post<{ conversation_id: number; reply: string }>('/api/ai/chat/', {
        message: msg,
        ...(convId ? { conversation_id: convId } : {}),
      })
      setConvId(r.conversation_id)
      setMessages((m) => [...m, { role: 'assistant', content: r.reply }])
    } catch (err) {
      setError(errText(err))
    } finally {
      setSending(false)
    }
  }

  function startNewChat() {
    setConvId(null)
    setMessages([
      { role: 'assistant', content: "Started a new session! I'm ready for your training and recovery questions." },
    ])
    setError('')
  }

  async function refreshTips() {
    setError('')
    try {
      const r = await api.post<{ suggestions: string[] }>('/api/nutrition/suggestions/', {})
      setTips(r.suggestions)
    } catch (err) {
      setError(errText(err))
    }
  }

  return (
    <div className="db-grid db-two" style={{ alignItems: 'start' }}>
      <div className="db-card db-chat">
        <div className="db-row-between" style={{ marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(11,31,54,.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px rgba(16,185,129,.6)' }} />
            <strong style={{ fontSize: 16 }}>AI Fitness Coach</strong>
            <span style={{ fontSize: 12, color: '#4A6078', background: '#DCE9F6', padding: '2px 8px', borderRadius: 999 }}>Gemini 3.5</span>
          </div>
          {messages.length > 1 && (
            <button
              type="button"
              className="db-btn alt sm"
              style={{ padding: '3px 10px', fontSize: 12 }}
              onClick={startNewChat}
            >
              New chat
            </button>
          )}
        </div>

        <div className="db-msgs" style={{ minHeight: 280, maxHeight: 460, overflowY: 'auto' }}>
          {loadingHistory ? (
            <p className="db-empty" style={{ textAlign: 'center', padding: '20px 0' }}>Loading coach conversation…</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`db-bubble ${m.role}`}>
                {m.content}
              </div>
            ))
          )}
          {sending && (
            <div className="db-bubble assistant db-typing">
              <i /><i /><i />
            </div>
          )}
          <div ref={end} />
        </div>

        {error && <div className="db-alert">{error}</div>}

        <div className="db-qchips" style={{ marginTop: 12 }}>
          {QUICK.map((q) => (
            <button
              type="button"
              key={q}
              className="db-pill"
              disabled={sending}
              onClick={() => sendText(q)}
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="db-send" style={{ marginTop: 10 }}>
          <input
            className="db-in"
            placeholder="Ask your coach anything about workouts, recovery or diet…"
            value={text}
            disabled={sending}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="db-btn" disabled={sending || !text.trim()}>
            {sending ? 'Thinking…' : 'Send'}
          </button>
        </form>
      </div>

      <div className="db-card">
        <h3>Nutrition Guidance</h3>
        {tips.length ? (
          <ul className="db-tips" style={{ marginBottom: 18 }}>
            {tips.map((t, idx) => (
              <li key={idx} style={{ lineHeight: 1.5 }}>{t}</li>
            ))}
          </ul>
        ) : (
          <p className="db-sub">General nutrition ideas to support your training and recovery.</p>
        )}
        <button className="db-btn alt sm" onClick={refreshTips}>
          Refresh suggestions
        </button>
      </div>
    </div>
  )
}
