import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Trash2, Sparkles, ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import MessageBubble from '../components/MessageBubble'
import { TypingDots, ErrorBox } from '../components/ui'
import { SUGGESTED_QUESTIONS } from '../i18n'
import { chat } from '../agents/chatAgent'
import { detectIntent, getService } from '../lib/appGuide'
import './ChatPage.css'

const HISTORY_KEY = 'tahseen.chat.v1'

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function ChatPage() {
  const account = useAccount()
  const { t, isRTL, lang } = account
  const navigate = useNavigate()

  const [messages, setMessages] = useState(loadHistory)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Persist the conversation so it survives navigation + reloads.
  useEffect(() => {
    try {
      if (messages.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-100)))
      else localStorage.removeItem(HISTORY_KEY)
    } catch { /* ignore quota */ }
  }, [messages])

  const humanError = useCallback(
    (e) => (e?.code === 'MISSING_API_KEY' ? t('aiNeedsKey') : t('error')),
    [t]
  )

  const scrollToBottom = useCallback((animated = true) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: animated ? 'smooth' : 'instant',
    })
  }, [])

  useEffect(() => {
    scrollToBottom(false)
  }, [messages, busy, scrollToBottom])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
    try { localStorage.removeItem(HISTORY_KEY) } catch { /* noop */ }
  }, [])

  const send = useCallback(
    async (text) => {
      const content = (text ?? input).trim()
      if (!content || busy) return

      const history = [...messages, { role: 'user', content }]
      setInput('')
      setError(null)

      // First, see if the user is asking to DO a service. If so, the assistant
      // confirms with a "did you mean …" action card (no API needed) — instant,
      // works even without an API key, and never executes without confirmation.
      const intent = detectIntent(content, lang)
      if (intent) {
        const s = intent.service
        const title = lang === 'en' ? s.title.en : s.title.ar
        const blurb = lang === 'en' ? s.blurb.en : s.blurb.ar
        const reply = {
          role: 'assistant',
          content: `${t('assistantConfirmService').replace('{service}', title)}\n\n${blurb}`,
          action: { serviceId: s.id, status: 'pending' },
        }
        setMessages([...history, reply])
        requestAnimationFrame(() => scrollToBottom())
        return
      }

      setMessages(history)
      setBusy(true)
      requestAnimationFrame(() => scrollToBottom())

      try {
        const reply = await chat(account, history)
        setMessages([...history, { role: 'assistant', content: reply }])
      } catch (e) {
        setMessages(history)
        setError(humanError(e))
      } finally {
        setBusy(false)
        requestAnimationFrame(() => scrollToBottom())
      }
    },
    [input, busy, messages, account, lang, t, scrollToBottom, humanError]
  )

  const retry = useCallback(async () => {
    if (busy || messages.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const reply = await chat(account, messages)
      setMessages([...messages, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(humanError(e))
    } finally {
      setBusy(false)
      requestAnimationFrame(() => scrollToBottom())
    }
  }, [busy, messages, account, scrollToBottom, humanError])

  // Resolve an action card: confirm → navigate, or dismiss.
  const resolveAction = useCallback(
    (index, confirmed) => {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === index && m.action
            ? { ...m, action: { ...m.action, status: confirmed ? 'done' : 'dismissed' } }
            : m
        )
      )
      if (confirmed) {
        const svc = getService(messages[index]?.action?.serviceId)
        if (svc) navigate(svc.route)
      }
    },
    [messages, navigate]
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        send()
      }
    },
    [send]
  )

  const Arrow = isRTL ? ArrowLeft : ArrowRight

  return (
    <div className="chat-screen">
      {/* ── Header ── */}
      <div className="chat-header">
        <div className="chat-header-text">
          <p className="chat-header-title">{t('appName')}</p>
          <p className="chat-header-subtitle">{t('tagline')}</p>
        </div>
        {messages.length > 0 && (
          <button className="chat-clear-btn" onClick={clearChat} type="button" aria-label={t('chatClear')} title={t('chatClear')}>
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* ── Message list ── */}
      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p className="chat-welcome-title">{t('chatWithTahseen')}</p>
            <p className="chat-assistant-intro"><Sparkles size={14} color="var(--gold)" /> {t('assistantIntro')}</p>
            <p className="chat-sugg-label">{t('suggestedQuestions')}</p>
            <div className="chat-chips">
              {SUGGESTED_QUESTIONS[lang].map((q, i) => (
                <button key={i} className="chat-chip chip-clickable" onClick={() => send(q)} type="button">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <React.Fragment key={i}>
            <MessageBubble role={m.role} content={m.content} />
            {m.action && (
              <ActionCard
                action={m.action}
                lang={lang}
                t={t}
                Arrow={Arrow}
                onConfirm={() => resolveAction(i, true)}
                onDismiss={() => resolveAction(i, false)}
              />
            )}
          </React.Fragment>
        ))}

        {busy && (
          <div className="chat-typing-wrap">
            <TypingDots />
          </div>
        )}

        {error && (
          <div className="chat-error-wrap">
            <ErrorBox message={error} onRetry={retry} />
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="input chat-textarea"
          placeholder={t('chatPlaceholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          rows={1}
          aria-label={t('chatPlaceholder')}
          style={{ textAlign: 'start' }}
        />
        <button
          className="chat-send-btn"
          onClick={() => send()}
          disabled={!input.trim() || busy}
          aria-label={t('send')}
          type="button"
        >
          <Send size={18} color="var(--bg)" style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }} />
        </button>
      </div>
    </div>
  )
}

/** Confirm/cancel card the assistant shows when it thinks you want a service. */
function ActionCard({ action, lang, t, Arrow, onConfirm, onDismiss }) {
  const svc = getService(action.serviceId)
  if (!svc) return null
  const title = lang === 'en' ? svc.title.en : svc.title.ar

  if (action.status === 'done')
    return <div className="chat-action resolved done"><Arrow size={13} /> {t('assistantOpened').replace('{service}', title)}</div>
  if (action.status === 'dismissed')
    return <div className="chat-action resolved dismissed">{t('assistantDismissed')}</div>

  return (
    <div className="chat-action">
      <button className="chat-action-btn confirm" onClick={onConfirm} type="button">
        <Arrow size={15} /> {t('assistantOpen')} <span className="chat-action-svc">· {title}</span>
      </button>
      <button className="chat-action-btn cancel" onClick={onDismiss} type="button">
        <X size={14} /> {t('assistantDismiss')}
      </button>
    </div>
  )
}
