import React, { useMemo } from 'react'
import RiyalSymbol from './RiyalSymbol'
import './AnalyticsCharts.css'

const compact = (n) => {
  const v = Math.round(Number(n) || 0)
  if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k'
  return String(v)
}

/* ══════════ Spending trajectory — actual vs projected vs budget ══════════ */
export function SpendingTrendChart({ series, t, isRTL }) {
  const W = 340, H = 176, padT = 16, padB = 26, padL = 14, padR = 14
  const plotW = W - padL - padR, plotH = H - padT - padB
  const { actual, projected, budget, daysInMonth, today, maxY } = series
  const denom = Math.max(1, daysInMonth - 1)

  const xFor = (day) => {
    const f = (day - 1) / denom
    return isRTL ? W - padR - f * plotW : padL + f * plotW
  }
  const yFor = (v) => H - padB - (Math.max(0, v) / maxY) * plotH

  const toPath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'} ${xFor(p.day).toFixed(1)} ${yFor(p.value).toFixed(1)}`).join(' ')
  const actualPath = actual.length ? toPath(actual) : ''
  const projPath = projected.length > 1 ? toPath(projected) : ''
  const areaPath = actual.length
    ? `${toPath(actual)} L ${xFor(actual[actual.length - 1].day).toFixed(1)} ${(H - padB).toFixed(1)} L ${xFor(actual[0].day).toFixed(1)} ${(H - padB).toFixed(1)} Z`
    : ''
  const last = actual[actual.length - 1]
  const budgetY = yFor(budget)

  return (
    <div className="chart-card">
      <div className="chart-head">
        <span className="chart-title">{t('spendingTrend')}</span>
        <div className="chart-legend">
          <span><i className="ln gold" /> {t('actualLabel')}</span>
          <span><i className="ln teal dashed" /> {t('projectedLabel')}</span>
          <span><i className="ln muted dashed" /> {t('budgetLine')}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={t('spendingTrend')}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {budget > 0 && budgetY > padT && budgetY < H - padB && (
          <>
            <line x1={padL} y1={budgetY} x2={W - padR} y2={budgetY} className="chart-budget-line" />
            <text x={isRTL ? W - padR : padL} y={budgetY - 4} className="chart-budget-label" textAnchor={isRTL ? 'end' : 'start'}>
              {t('budgetLine')} {compact(budget)}
            </text>
          </>
        )}

        {areaPath && <path d={areaPath} fill="url(#trend-fill)" />}
        {actualPath && <path d={actualPath} className="chart-line-actual" fill="none" />}
        {projPath && <path d={projPath} className="chart-line-proj" fill="none" />}
        {last && <circle cx={xFor(last.day)} cy={yFor(last.value)} r="4" className="chart-today-dot" />}

        <text x={xFor(1)} y={H - 8} className="chart-axis" textAnchor="middle">1</text>
        {last && <text x={xFor(today)} y={H - 8} className="chart-axis today" textAnchor="middle">{t('today')}</text>}
        <text x={xFor(daysInMonth)} y={H - 8} className="chart-axis" textAnchor="middle">{daysInMonth}</text>
      </svg>
    </div>
  )
}

/* ══════════ Monthly spending — which months rise & fall ══════════ */
export function MonthlyBarsChart({ series, t, lang, isRTL, formatMoney }) {
  const { months, peak, avg } = series
  const W = 340, H = 184, padT = 22, padB = 26, padX = 10
  const plotW = W - padX * 2, plotH = H - padT - padB
  const ordered = isRTL ? [...months].reverse() : months
  const n = ordered.length
  const slot = plotW / n
  const barW = Math.min(34, slot * 0.6)
  const yFor = (v) => H - padB - (v / peak) * plotH
  const avgY = yFor(avg)
  const monthLabel = (m) => new Date(m.year, m.month, 1).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US', { month: 'short' })

  return (
    <div className="chart-card">
      <div className="chart-head">
        <span className="chart-title">{t('monthlySpending')}</span>
        <span className="chart-sub">{t('avgLabel')} {compact(avg)} <RiyalSymbol size="0.7em" /></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={t('monthlySpending')}>
        <line x1={padX} y1={avgY} x2={W - padX} y2={avgY} className="chart-avg-line" />
        {ordered.map((m, i) => {
          const cx = padX + slot * i + slot / 2
          const bh = Math.max(2, (m.total / peak) * plotH)
          const y = H - padB - bh
          const cls = `chart-bar${m.isPeak ? ' peak' : m.isCurrent ? ' current' : ''}`
          return (
            <g key={i}>
              <rect x={cx - barW / 2} y={y} width={barW} height={bh} rx="5" className={cls} style={{ transformOrigin: `center ${H - padB}px`, animationDelay: `${i * 70}ms` }} />
              {(m.isPeak || m.isCurrent) && (
                <text x={cx} y={y - 5} className="chart-bar-value" textAnchor="middle">{compact(m.total)}</text>
              )}
              <text x={cx} y={H - 8} className={`chart-axis${m.isCurrent ? ' today' : ''}`} textAnchor="middle">{monthLabel(m)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ══════════ Fixed-expense category donut ══════════ */
const DONUT_COLORS = ['var(--gold)', 'var(--teal-light)', 'var(--warning)', 'var(--success-bright)', '#c58f6a', 'var(--text-muted)']
const CAT_KEY = { rent: 'catRent', utilities: 'catUtilities', subscription: 'catSubscription', transport: 'catTransport', other: 'catOther' }

export function CategoryDonut({ series, t, formatMoney }) {
  const { entries, total } = series
  const arcs = useMemo(() => {
    if (total <= 0) return []
    const R = 62, C = 100, sw = 22
    const circ = 2 * Math.PI * R
    let offset = 0
    return entries.map((e, i) => {
      const frac = e.amount / total
      const dash = frac * circ
      const seg = { key: e.category, color: DONUT_COLORS[i % DONUT_COLORS.length], amount: e.amount, pct: Math.round(frac * 100), R, C, sw, circ, dash, offset }
      offset += dash
      return seg
    })
  }, [entries, total])

  if (total <= 0) return null

  return (
    <div className="chart-card">
      <div className="chart-head"><span className="chart-title">{t('byCategory')}</span></div>
      <div className="donut-wrap">
        <svg viewBox="0 0 200 200" className="donut-svg" role="img" aria-label={t('byCategory')}>
          <circle cx="100" cy="100" r="62" fill="none" stroke="var(--border)" strokeWidth="22" />
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx="100" cy="100" r={a.R}
              fill="none"
              stroke={a.color}
              strokeWidth={a.sw}
              strokeDasharray={`${a.dash} ${a.circ - a.dash}`}
              strokeDashoffset={-a.offset}
              transform="rotate(-90 100 100)"
              className="donut-seg"
              style={{ animationDelay: `${i * 90}ms` }}
            />
          ))}
          <text x="100" y="94" className="donut-total" textAnchor="middle">{compact(total)}</text>
          <text x="100" y="114" className="donut-total-sub" textAnchor="middle">{t('totalFixedExpenses')}</text>
        </svg>
        <div className="donut-legend">
          {entries.map((e, i) => (
            <div key={e.category} className="donut-legend-row">
              <span className="donut-swatch" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="donut-legend-name">{t(CAT_KEY[e.category] || 'catOther')}</span>
              <span className="donut-legend-val">{formatMoney(e.amount)} <RiyalSymbol size="0.7em" /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
