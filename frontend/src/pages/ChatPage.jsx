import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import MessageBubble from '../components/MessageBubble'
import { TypingDots, ErrorBox } from '../components/ui'
import { SUGGESTED_QUESTIONS } from '../i18n'
import { chat } from '../agents/chatAgent'
import './ChatPage.css'

export default function ChatPage() {
  const account = useAccount()
  const { t, isRTL, lang } = account

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const scrollRef = useRef(null)
  const inputRef = useRef(null)

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

  const send = useCallback(
    async (text) => {
      const content = (text ?? input).trim()
      if (!content || busy) return

      const history = [...messages, { role: 'user', content }]
      setMessages(history)
      setInput('')
      setBusy(true)
      setError(null)

      // scroll after state update renders
      requestAnimationFrame(() => scrollToBottom())

      try {
        const reply = await chat(account, history)
        setMessages([...history, { role: 'assistant', content: reply }])
      } catch (e) {
        setError(e?.message || t('error'))
      } finally {
        setBusy(false)
        requestAnimationFrame(() => scrollToBottom())
      }
    },
    [input, busy, messages, account, t, scrollToBottom]
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

  const handleChip = useCallback(
    (q) => {
      send(q)
    },
    [send]
  )

  return (
    <div className="chat-screen">
      {/* ── Header ── */}
      <div className="chat-header">
        <p className="chat-header-title">{t('appName')}</p>
        <p className="chat-header-subtitle">{t('tagline')}</p>
      </div>

      {/* ── Message list ── */}
      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p className="chat-welcome-title">{t('chatWithTahseen')}</p>
            <p className="chat-sugg-label">{t('suggestedQuestions')}</p>
            <div className="chat-chips">
              {SUGGESTED_QUESTIONS[lang].map((q, i) => (
                <button
                  key={i}
                  className="chat-chip chip-clickable"
                  onClick={() => handleChip(q)}
                  type="button"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}

        {busy && (
          <div className="chat-typing-wrap">
            <TypingDots />
          </div>
        )}

        {error && (
          <div className="chat-error-wrap">
            <ErrorBox message={error} onRetry={() => { setError(null); send(messages[messages.length - 1]?.content) }} />
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
          {/* flip send icon in RTL so it points to the correct direction */}
          <Send
            size={18}
            color="var(--bg)"
            style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}
          />
        </button>
      </div>
    </div>
  )
}
