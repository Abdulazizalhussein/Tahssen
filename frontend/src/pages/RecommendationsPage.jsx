import React, { useState, useEffect, useCallback } from 'react'
import {
  Sparkles, TrendingUp, TrendingDown, PiggyBank, ShieldCheck, Target,
  RefreshCw, CalendarClock, ArrowUpRight,
} from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import { SectionTitle, TypingDots } from '../components/ui'
import RiyalSymbol from '../components/RiyalSymbol'
import { getRecommendations } from '../agents/recommendAgent'
import './RecommendationsPage.css'

// Category → icon + accent color + i18n label key.
const CATEGORY = {
  save:    { icon: PiggyBank,   color: 'var(--success-bright)', labelKey: 'catSave' },
  protect: { icon: ShieldCheck, color: 'var(--gold)',          labelKey: 'catProtect' },
  plan:    { icon: Target,      color: 'var(--teal-light)',    labelKey: 'catPlan' },
  spend:   { icon: TrendingDown,color: 'var(--warning)',       labelKey: 'catSpend' },
  grow:    { icon: TrendingUp,  color: 'var(--success-bright)',labelKey: 'catGrow' },
}
const PRIORITY_KEY = { high: 'recPriorityHigh', medium: 'recPriorityMedium', low: 'recPriorityLow' }

export default function RecommendationsPage() {
  const account = useAccount()
  const { t, formatMoney } = account
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getRecommendations(account))
    } catch {
      setData({ forecast: null, recommendations: [] })
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.balance, account.monthlySpent, account.monthlyIncome, account.transactions.length, account.lang])

  useEffect(() => { load() }, [load])

  const forecast = data?.forecast
  const recs = data?.recommendations ?? []

  return (
    <div className="page-scroll recs-page">
      <div className="recs-head">
        <span className="recs-head-icon"><Sparkles size={22} color="var(--gold)" /></span>
        <div>
          <h1 className="recs-title">{t('recommendationsTitle')}</h1>
          <p className="recs-intro">{t('recommendationsIntro')}</p>
        </div>
      </div>

      {/* Forecast hero */}
      {forecast && (
        <div className="recs-forecast">
          <div className="recs-forecast-main">
            <span className="recs-forecast-label">
              <CalendarClock size={14} color="var(--teal-light)" aria-hidden="true" /> {t('forecastTitle')}
            </span>
            <div className="recs-forecast-amount">
              {formatMoney(forecast.predictedMonthEndBalance)} <RiyalSymbol size="0.5em" />
            </div>
            {forecast.balance > 0 && (
              <span className="recs-forecast-delta">
                {t('forecastFromBalance').replace('{n}', formatMoney(forecast.balance))}
              </span>
            )}
            <span className="recs-forecast-sub">
              {forecast.projectedRemainingSpend > 0
                ? t('forecastSpendNote').replace('{n}', formatMoney(forecast.projectedRemainingSpend))
                : t('forecastSubtitle')}
            </span>
          </div>
          {forecast.potentialSavings > 0 && (
            <div className="recs-savings">
              <PiggyBank size={18} color="var(--success-bright)" aria-hidden="true" />
              <div>
                <span className="recs-savings-label">{t('potentialSavings')}</span>
                <span className="recs-savings-value">
                  {formatMoney(forecast.potentialSavings)} <RiyalSymbol size="0.75em" />
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      <div className="recs-list-head">
        <SectionTitle icon={Sparkles}>{t('yourRecommendations')}</SectionTitle>
        {!loading && (
          <button className="recs-refresh" onClick={load} type="button" aria-label={t('recRefresh')}>
            <RefreshCw size={15} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="recs-loading" role="status" aria-label={t('recAnalyzing')}>
          <ShieldCheck size={20} color="var(--gold)" />
          <span>{t('recAnalyzing')}</span>
          <TypingDots />
        </div>
      ) : recs.length === 0 ? (
        <div className="empty-state"><Sparkles size={26} /><span>{t('recEmpty')}</span></div>
      ) : (
        <div className="recs-list">
          {recs.map((r) => (
            <RecCard key={r.id} rec={r} t={t} formatMoney={formatMoney} />
          ))}
        </div>
      )}

      <p className="recs-powered">
        <Sparkles size={12} /> {t('recPoweredBy')}
      </p>
    </div>
  )
}

function RecCard({ rec, t, formatMoney }) {
  const meta = CATEGORY[rec.category] || CATEGORY.plan
  const Icon = meta.icon
  return (
    <div className="rec-card" style={{ '--accent': meta.color }}>
      <span className="rec-card-icon" style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}>
        <Icon size={20} />
      </span>
      <div className="rec-card-body">
        <div className="rec-card-top">
          <span className="rec-card-cat" style={{ color: meta.color }}>{t(meta.labelKey)}</span>
          <span className={`rec-card-priority ${rec.priority}`}>{t(PRIORITY_KEY[rec.priority])}</span>
        </div>
        <h3 className="rec-card-title">{rec.title}</h3>
        <p className="rec-card-detail">{rec.detail}</p>
        {rec.impact > 0 && (
          <div className="rec-card-impact">
            <span className="rec-card-impact-label">{t('recImpactLabel')}</span>
            <span className="rec-card-impact-value" style={{ color: meta.color }}>
              {formatMoney(rec.impact)} <RiyalSymbol size="0.8em" />
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
