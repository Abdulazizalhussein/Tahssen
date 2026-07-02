import React, { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAccount } from '../store/AccountContext'

export function SectionTitle({ children, icon: Icon }) {
  return (
    <div className="section-title">
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      <span>{children}</span>
    </div>
  )
}

export function ErrorBox({ message, onRetry }) {
  const { t } = useAccount()
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: 'var(--danger-dim)',
        border: '1px solid var(--danger-border)',
        borderRadius: 'var(--radius)',
        padding: '12px var(--sp-4)',
      }}
    >
      <AlertTriangle size={16} color="var(--danger)" style={{ flexShrink: 0, marginBlockStart: 2 }} aria-hidden="true" />
      <span style={{ color: 'var(--text)', fontSize: 14, flex: 1, lineHeight: 1.5 }}>
        {message || t('error')}
      </span>
      {onRetry ? (
        <button
          onClick={onRetry}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--danger)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            flexShrink: 0,
            padding: '2px 0',
          }}
          aria-label={t('tryAgain')}
        >
          {t('tryAgain')}
        </button>
      ) : null}
    </div>
  )
}

export function TypingDots() {
  const dot1 = useRef(null)
  const dot2 = useRef(null)
  const dot3 = useRef(null)

  useEffect(() => {
    const dots = [dot1.current, dot2.current, dot3.current]

    dots.forEach((dot, i) => {
      if (!dot) return
      dot.animate(
        [{ opacity: 0.25 }, { opacity: 1 }, { opacity: 0.25 }],
        { duration: 1000, iterations: Infinity, delay: i * 180, easing: 'ease-in-out' }
      )
    })
  }, [])

  return (
    <div
      style={{ display: 'flex', gap: 5, padding: '2px 0', alignItems: 'center' }}
      aria-hidden="true"
    >
      {[dot1, dot2, dot3].map((ref, i) => (
        <div
          key={i}
          ref={ref}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--text-muted)',
            opacity: 0.25,
          }}
        />
      ))}
    </div>
  )
}
