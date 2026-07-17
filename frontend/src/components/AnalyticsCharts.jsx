import React, { useMemo, useState } from 'react'
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

/* ══════════ Spending timeline — past actual → now → future forecast ══════════ */
const KIND_KEY = { past: 'tlKindPast', current: 'tlKindCurrent', future: 'tlKindFuture' }

export function MonthlyBarsChart({ series, t, lang, isRTL, formatMoney }) {
  const { months, peak, avg, basis } = series
  const [sel, setSel] = useState(null)
  const W = 340, H = 196, padT = 24, padB = 28, padX = 12
  const plotW = W - padX * 2, plotH = H - padT - padB
  const ordered = isRTL ? [...months].reverse() : months
  const n = ordered.length
  const slot = plotW / n
  const barW = Math.min(30, slot * 0.56)
  const bottom = H - padB
  const yFor = (v) => bottom - (Math.max(0, v) / peak) * plotH
  const avgY = yFor(avg)
  const cx = (i) => padX + slot * i + slot / 2
  const monthLabel = (m) => new Date(m.year, m.month, 1).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US', { month: 'short' })

  // Forecast region (current + future) vs the past region, direction-aware.
  const curIdx = ordered.findIndex((m) => m.isCurrent)
  const nowX = isRTL ? padX + slot * (curIdx + 1) : padX + slot * curIdx
  const zone = isRTL ? { x: padX, w: nowX - padX } : { x: nowX, w: W - padX - nowX }

  const selM = sel != null ? ordered[sel] : null

  return (
    <div className="chart-card">
      <div className="chart-head">
        <span className="chart-title">{t('monthlySpending')}</span>
        <span className="chart-sub">{t('avgLabel')} {compact(avg)} <RiyalSymbol size="0.7em" /></span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg tl-chart" role="img" aria-label={t('monthlySpending')}>
        <defs>
          {/* forecast texture — hatch reads as "predicted" even in grayscale */}
          <pattern id="tl-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--gold)" opacity="0.18" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--gold)" strokeWidth="2.4" />
          </pattern>
        </defs>

        {/* forecast zone background + "now" divider */}
        <rect x={zone.x} y={padT - 6} width={Math.max(0, zone.w)} height={plotH + 6} className="tl-forecast-zone" />
        <line x1={nowX} y1={padT - 6} x2={nowX} y2={bottom} className="tl-now-line" />
        <text x={nowX} y={padT - 10} className="tl-now-label" textAnchor="middle">{t('tlNow')}</text>

        <line x1={padX} y1={avgY} x2={W - padX} y2={avgY} className="chart-avg-line" />

        {ordered.map((m, i) => {
          const bx = cx(i) - barW / 2
          const actualH = Math.max(0, (m.actual / peak) * plotH)
          const predH = Math.max(0, (m.predicted / peak) * plotH)
          const totalH = Math.max(2, actualH + predH)
          const dim = sel != null && sel !== i ? ' dim' : ''
          const on = sel === i ? ' on' : ''
          return (
            <g key={i} className={`tl-bar-g${dim}${on}`} style={{ transformOrigin: `center ${bottom}px`, animationDelay: `${i * 60}ms` }}
               onClick={() => setSel(sel === i ? null : i)} role="button" tabIndex={0}
               onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(sel === i ? null : i) } }}
               aria-label={`${monthLabel(m)} · ${t(KIND_KEY[m.kind])}`}>
              {/* actual (consumed) — solid */}
              {actualH > 0.5 && (
                <rect x={bx} y={bottom - actualH} width={barW} height={actualH}
                  className={`tl-actual ${m.kind}`} rx={predH > 0.5 ? 0 : 4} />
              )}
              {/* predicted (forecast) — hatched */}
              {predH > 0.5 && (
                <rect x={bx} y={bottom - actualH - predH} width={barW} height={predH} rx="4" className="tl-pred" />
              )}
              {/* current bar outline to mark "you are here" */}
              {m.isCurrent && <rect x={bx - 1.5} y={bottom - totalH - 1.5} width={barW + 3} height={totalH + 1.5} rx="5" className="tl-current-outline" />}
              {(m.isPeak || m.isCurrent || sel === i) && (
                <text x={cx(i)} y={bottom - totalH - 5} className="chart-bar-value" textAnchor="middle">{compact(m.total)}</text>
              )}
              <text x={cx(i)} y={H - 9} className={`chart-axis${m.isCurrent ? ' today' : ''}`} textAnchor="middle">{monthLabel(m)}</text>
            </g>
          )
        })}
      </svg>

      {/* detail (selected) or legend */}
      {selM ? (
        <div className="tl-detail">
          <div className="tl-detail-head">
            <span className={`tl-chip ${selM.kind}`}>{t(KIND_KEY[selM.kind])}</span>
            <strong>{monthLabel(selM)}</strong>
          </div>
          <div className="tl-detail-rows">
            {selM.actual > 0 && <span>{t('tlConsumed')}: <b>{formatMoney(selM.actual)} <RiyalSymbol size="0.75em" /></b></span>}
            {selM.predicted > 0 && <span>{t('tlForecast')}: <b>{formatMoney(selM.predicted)} <RiyalSymbol size="0.75em" /></b></span>}
            <span>{t('tlTotal')}: <b>{formatMoney(selM.total)} <RiyalSymbol size="0.75em" /></b></span>
          </div>
        </div>
      ) : (
        <>
          <div className="chart-legend chart-legend-center">
            <span><i className="sq teal" /> {t('tlActual')}</span>
            <span><i className="sq hatch" /> {t('tlPredicted')}</span>
          </div>
          <p className="tl-basis">{t(basis === 'behavior' ? 'tlBasisBehavior' : 'tlBasisBudget')}</p>
        </>
      )}
    </div>
  )
}

/* ══════════ Fixed-expense category donut ══════════ */
const DONUT_COLORS = ['var(--gold)', 'var(--teal-light)', 'var(--warning)', 'var(--success-bright)', '#c58f6a', 'var(--text-muted)']
const CAT_KEY = { rent: 'catRent', utilities: 'catUtilities', subscription: 'catSubscription', transport: 'catTransport', other: 'catOther' }

export function CategoryDonut({ series, t, formatMoney }) {
  const { entries, total } = series
  // Normalize the ring to pathLength=100 so dashes are in percent units. This
  // avoids the getTotalLength() vs 2πr rounding gap that left a 100% segment
  // rendering as a partial arc.
  const arcs = useMemo(() => {
    if (total <= 0) return []
    let offset = 0
    return entries.map((e, i) => {
      const pct = (e.amount / total) * 100
      const seg = { key: e.category, color: DONUT_COLORS[i % DONUT_COLORS.length], amount: e.amount, pct, offset }
      offset += pct
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
              cx="100" cy="100" r="62"
              fill="none"
              stroke={a.color}
              strokeWidth="22"
              pathLength="100"
              strokeDasharray={`${a.pct} ${100 - a.pct}`}
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
