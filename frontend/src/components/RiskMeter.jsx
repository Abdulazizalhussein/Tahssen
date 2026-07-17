import React, { useEffect, useRef, useState } from 'react'
import { riskColorByScore } from '../theme'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * RiskMeter — the dramatic payoff of the assessment. The arc sweeps and the
 * number counts up from 0 to the score on mount (skipped under reduced motion),
 * so the verdict lands with weight.
 */
export default function RiskMeter({ score = 0, size = 180, label }) {
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const target = Math.max(0, Math.min(100, score))

  const [display, setDisplay] = useState(prefersReducedMotion() ? target : 0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(target)
      return
    }
    const duration = 850
    let start = null
    const step = (ts) => {
      if (start === null) start = ts
      const p = Math.min(1, (ts - start) / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(target * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => rafRef.current && cancelAnimationFrame(rafRef.current)
  }, [target])

  const dash = (display / 100) * circumference
  const color = riskColorByScore(display)
  const center = size / 2

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={label ? `${label}: ${target}` : `${target} / 100`}
        role="img"
        style={{ display: 'block' }}
      >
        {/* Track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="var(--border-light)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke 0.4s ease', filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>

      {/* Centred label overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            color,
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            transition: 'color 0.4s ease',
          }}
        >
          {display}
        </span>
        {label ? (
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              marginBlockStart: 4,
              textAlign: 'center',
            }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </div>
  )
}
