import React from 'react'
import { riskColorByScore } from '../theme'

export default function RiskMeter({ score = 0, size = 180, label }) {
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const dash = (clamped / 100) * circumference
  const color = riskColorByScore(clamped)
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
        aria-label={label ? `${label}: ${clamped}` : `Risk score: ${clamped}`}
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
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
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
          {clamped}
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
