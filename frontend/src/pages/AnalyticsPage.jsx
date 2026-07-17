import React, { useState, useCallback, useEffect } from 'react'
import {
  RefreshCw,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart2,
  PieChart,
  Calendar,
  ArrowUpRight,
  Shield,
  List,
  Plus,
  X,
  Trash2,
  Inbox,
  Edit2,
} from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import { SectionTitle, ErrorBox } from '../components/ui'
import { generateInsights, computeStats } from '../agents/chatAgent'
import { computeHealth, computeForecast, dailySpendSeries, monthlySpendSeries, categorySpendSeries } from '../lib/finance'
import { riskColorByScore } from '../theme'
import RiyalSymbol from '../components/RiyalSymbol'
import { SpendingTrendChart, MonthlyBarsChart, CategoryDonut } from '../components/AnalyticsCharts'
import './AnalyticsPage.css'

const CATEGORIES = [
  { key: 'rent',         labelKey: 'catRent' },
  { key: 'utilities',   labelKey: 'catUtilities' },
  { key: 'subscription',labelKey: 'catSubscription' },
  { key: 'transport',   labelKey: 'catTransport' },
  { key: 'other',       labelKey: 'catOther' },
]

const QUICK_CHIPS = [
  { name: 'إيجار',   nameEn: 'Rent',        category: 'rent' },
  { name: 'كهرباء', nameEn: 'Electricity',  category: 'utilities' },
  { name: 'إنترنت', nameEn: 'Internet',     category: 'subscription' },
  { name: '',        nameEn: '',             category: 'other' },
]

/* ── Health Ring SVG ─────────────────────────────────────────── */
function HealthRing({ score }) {
  const size = 160
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  // score is 0-100. Dash offset so a score of 0 = empty ring, 100 = full ring.
  const clamped = Math.min(100, Math.max(0, score))
  const offset = circumference - (clamped / 100) * circumference

  const color =
    clamped >= 70
      ? 'var(--teal-light)'
      : clamped >= 40
      ? 'var(--warning)'
      : 'var(--danger)'

  return (
    <div className="analytics-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div className="analytics-ring-label">
        <span className="analytics-ring-score" style={{ color }}>{clamped}</span>
        <span className="analytics-ring-sub">/ 100</span>
      </div>
    </div>
  )
}

/* ── Budget Breakdown ─────────────────────────────────────────── */
function BudgetBreakdown({ income, fixed, variable, formatMoney, t }) {
  const remaining = income - fixed - variable
  const inDeficit = remaining < 0
  const max = Math.max(income, fixed + variable, 1)
  const rows = [
    { label: t('income'),           value: income,    color: 'var(--teal)' },
    { label: t('fixed'),            value: fixed,     color: 'var(--danger)' },
    { label: t('variableSpending'), value: variable,  color: 'var(--warning)' },
    {
      // A negative remainder is a DEFICIT, not "remaining" — say so.
      label: inDeficit ? t('deficit') : t('remaining'),
      value: remaining,
      color: inDeficit ? 'var(--danger)' : 'var(--success)',
    },
  ]
  return (
    <div className="analytics-budget-card">
      {rows.map((r, i) => (
        <div key={i} className="analytics-budget-row">
          <div className="analytics-budget-label-row">
            <span className="analytics-budget-label">{r.label}</span>
            <span className="analytics-budget-value" style={{ color: r.color }}>
              {formatMoney(r.value)} <RiyalSymbol size="0.8em" />
            </span>
          </div>
          <div className="analytics-budget-track">
            <div
              className="analytics-budget-fill"
              style={{
                width: `${Math.min(100, (Math.abs(r.value) / max) * 100)}%`,
                backgroundColor: r.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ label, value, Icon, color }) {
  return (
    <div className="analytics-stat-card">
      <div className="analytics-stat-icon" style={{ backgroundColor: `${color}22` }}>
        <Icon size={16} color={color} />
      </div>
      <div className="analytics-stat-value">{value}</div>
      <div className="analytics-stat-label">{label}</div>
    </div>
  )
}

/* ── Onboarding card (income not yet set) ─────────────────────── */
function OnboardingCard({
  incomeInput,
  setIncomeInput,
  fixedExpenses,
  catLabel,
  onQuickAdd,
  onRemove,
  onSave,
  formatMoney,
  t,
  isRTL,
}) {
  return (
    <div className="analytics-onboard-card">
      <div className="analytics-onboard-head">
        <div className="analytics-bulb">
          <Zap size={18} color="var(--gold)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="analytics-onboard-title">{t('enableAnalyticsTitle')}</div>
          <div className="analytics-onboard-sub">{t('enableAnalyticsSubtitle')}</div>
        </div>
      </div>

      <label className="analytics-field-label">{t('monthlyIncome')}</label>
      <div className="analytics-input-wrap">
        <TrendingUp size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <input
          type="number"
          placeholder={`0 ${t('currency')}`}
          value={incomeInput}
          onChange={(e) => setIncomeInput(e.target.value)}
        />
      </div>

      <label className="analytics-field-label analytics-mt-18">{t('fixedExpenses')}</label>

      {fixedExpenses.length > 0 &&
        fixedExpenses.map((e) => (
          <div key={e.id} className="analytics-exp-row">
            <div className="analytics-exp-name-col">
              <div className="analytics-exp-name">{e.name}</div>
              <div className="analytics-exp-cat">{catLabel(e.category)}</div>
            </div>
            <span className="analytics-exp-amount">
              {formatMoney(e.amount)} <RiyalSymbol size="0.8em" />
            </span>
            <button
              className="analytics-trash-btn"
              onClick={() => onRemove(e.id)}
              aria-label={t('remove')}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}

      <div className="analytics-chips-wrap">
        {QUICK_CHIPS.map((c, i) => (
          <button
            key={i}
            className="analytics-quick-chip"
            onClick={() => onQuickAdd(c)}
          >
            <Plus size={14} color="var(--teal-light)" />
            {c.category === 'other' ? t('catOther') : isRTL ? c.name : c.nameEn}
          </button>
        ))}
      </div>

      <button
        className="analytics-primary-btn"
        onClick={onSave}
        disabled={!(Number(incomeInput) > 0)}
      >
        {t('saveAndEnable')}
      </button>
    </div>
  )
}

/* ── Expense row in sheets ────────────────────────────────────── */
function ExpenseRow({ e, catLabel, formatMoney, onRemove, t, isRTL }) {
  return (
    <div className="analytics-exp-row">
      <div className="analytics-exp-name-col">
        <div className="analytics-exp-name">{e.name}</div>
        <div className="analytics-exp-cat">{catLabel(e.category)}</div>
      </div>
      <span className="analytics-exp-amount">
        {formatMoney(e.amount)} <RiyalSymbol size="0.8em" />
      </span>
      <button
        className="analytics-trash-btn"
        onClick={() => onRemove(e.id)}
        aria-label={t('remove')}
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}

/* ── Add Expense Modal ────────────────────────────────────────── */
function ExpenseModal({ visible, preset, onClose, onSave, t, isRTL }) {
  const [expName, setExpName]       = useState('')
  const [expAmount, setExpAmount]   = useState('')
  const [expCategory, setExpCategory] = useState('other')

  useEffect(() => {
    if (visible && preset) {
      setExpName(isRTL ? preset.name : preset.nameEn)
      setExpCategory(preset.category || 'other')
    }
  }, [visible, preset, isRTL])

  const reset = () => {
    setExpName('')
    setExpAmount('')
    setExpCategory('other')
  }

  const handleSave = async () => {
    if (!expName.trim() || !(Number(expAmount) > 0)) return
    await onSave({ name: expName.trim(), amount: Number(expAmount), category: expCategory })
    reset()
    onClose()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!visible) return null

  const canSave = expName.trim().length > 0 && Number(expAmount) > 0

  return (
    <div
      className="analytics-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="analytics-sheet">
        <div className="analytics-sheet-head">
          <span className="analytics-sheet-title">{t('newExpense')}</span>
          <button className="analytics-close-btn" onClick={handleClose} aria-label={t('dismiss')}>
            <X size={22} />
          </button>
        </div>

        <label className="analytics-field-label">
          {t('expenseName')}
        </label>
        <div className="analytics-input-wrap">
          <input
            type="text"
            placeholder={t('expenseName')}
            value={expName}
            onChange={(e) => setExpName(e.target.value)}
            autoFocus
          />
        </div>

        <label className="analytics-field-label analytics-mt-14">
          {`${t('expenseAmount')} (${t('currency')})`}
        </label>
        <div className="analytics-input-wrap">
          <input
            type="number"
            placeholder={`0 ${t('currency')}`}
            value={expAmount}
            onChange={(e) => setExpAmount(e.target.value)}
          />
        </div>

        <label className="analytics-field-label analytics-mt-14">
          {t('category')}
        </label>
        <div className="analytics-cat-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`analytics-cat-chip${expCategory === c.key ? ' active' : ''}`}
              onClick={() => setExpCategory(c.key)}
            >
              {t(c.labelKey)}
            </button>
          ))}
        </div>

        <button
          className="analytics-primary-btn"
          onClick={handleSave}
          disabled={!canSave}
        >
          {t('save')}
        </button>
      </div>
    </div>
  )
}

/* ── Edit Financials Modal ────────────────────────────────────── */
function EditFinancialsModal({
  visible,
  onClose,
  incomeInput,
  setIncomeInput,
  fixedExpenses,
  catLabel,
  formatMoney,
  onRemove,
  onAddExpense,
  onSave,
  t,
  isRTL,
}) {
  if (!visible) return null

  const handleSave = async () => {
    await onSave()
    onClose()
  }

  return (
    <div
      className="analytics-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="analytics-sheet">
        <div className="analytics-sheet-head">
          <span className="analytics-sheet-title">{t('editFinancials')}</span>
          <button className="analytics-close-btn" onClick={onClose} aria-label={t('dismiss')}>
            <X size={22} />
          </button>
        </div>

        <label className="analytics-field-label">
          {t('monthlyIncome')}
        </label>
        <div className="analytics-input-wrap">
          <TrendingUp size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            type="number"
            placeholder={`0 ${t('currency')}`}
            value={incomeInput}
            onChange={(e) => setIncomeInput(e.target.value)}
          />
        </div>

        <label className="analytics-field-label analytics-mt-18">
          {t('fixedExpenses')}
        </label>

        {fixedExpenses.length === 0 ? (
          <p className="analytics-empty-exp">{t('noFixedExpenses')}</p>
        ) : (
          fixedExpenses.map((e) => (
            <ExpenseRow
              key={e.id}
              e={e}
              catLabel={catLabel}
              formatMoney={formatMoney}
              onRemove={onRemove}
              t={t}
              isRTL={isRTL}
            />
          ))
        )}

        <button className="analytics-add-btn" onClick={onAddExpense}>
          <Plus size={18} />
          {t('addExpense')}
        </button>

        <button className="analytics-primary-btn" onClick={handleSave}>
          {t('done')}
        </button>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const account = useAccount()
  const {
    transactions,
    formatMoney,
    monthlyIncome,
    fixedExpenses,
    totalFixedExpenses,
    monthlySpent,
    saveMonthlyIncome,
    addExpense,
    removeExpense,
    t,
    isRTL,
    lang,
  } = account

  const [data, setData]           = useState(null)
  const [busy, setBusy]           = useState(false)
  const [error, setError]         = useState(null)
  const [incomeInput, setIncomeInput] = useState(monthlyIncome ? String(monthlyIncome) : '')
  const [editSheet, setEditSheet]     = useState(false)
  const [expenseModal, setExpenseModal] = useState(false)

  const stats = computeStats(transactions)
  const hasIncome = monthlyIncome > 0

  // Computed SYNCHRONOUSLY from the live account, so the health score, the
  // forecast and the charts all update the instant income/expenses change —
  // no stale async reload, no need to press "refresh".
  const health = computeHealth(account)
  const forecast = computeForecast(account)
  const dailySeries = dailySpendSeries(account, forecast)
  const monthlySeries = monthlySpendSeries(account, forecast)
  const categorySeries = categorySpendSeries(fixedExpenses)

  const load = useCallback(async () => {
    if (monthlyIncome <= 0) return
    setBusy(true)
    setError(null)
    try {
      const res = await generateInsights(account)
      setData(res)
    } catch (e) {
      setError(e?.message || t('error'))
    } finally {
      setBusy(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length, lang, monthlyIncome, totalFixedExpenses, monthlySpent])

  useEffect(() => {
    load()
  }, [load])

  /* Keep income input in sync when income changes externally */
  useEffect(() => {
    if (monthlyIncome > 0 && !incomeInput) {
      setIncomeInput(String(monthlyIncome))
    }
  }, [monthlyIncome]) // eslint-disable-line react-hooks/exhaustive-deps

  const catLabel = (key) => {
    const c = CATEGORIES.find((x) => x.key === key)
    return c ? t(c.labelKey) : t('catOther')
  }

  const openExpense = (preset) => {
    setExpenseModal(preset && preset.category ? preset : true)
  }

  const handleSaveExpense = async ({ name, amount, category }) => {
    await addExpense({ name, nameEn: '', amount, category })
  }

  const handleSaveOnboarding = async () => {
    await saveMonthlyIncome(Number(incomeInput) || 0)
  }

  const handleSaveEditSheet = async () => {
    await saveMonthlyIncome(Number(incomeInput) || 0)
  }

  const sortedByRisk = [...transactions].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8)

  return (
    <div className="analytics-screen">
      {/* ── Header ── */}
      <div className="analytics-head-row">
        <h1 className="analytics-h1">{t('tabAnalytics')}</h1>
        {hasIncome && (
          <button
            className="analytics-refresh-btn"
            onClick={load}
            disabled={busy}
            aria-label={t('refresh')}
          >
            <RefreshCw
              size={16}
              style={{ animation: busy ? 'spin 0.7s linear infinite' : 'none' }}
            />
            {t('refresh')}
          </button>
        )}
      </div>

      {/* ── Onboarding banner OR main analytics ── */}
      {!hasIncome ? (
        <OnboardingCard
          incomeInput={incomeInput}
          setIncomeInput={setIncomeInput}
          fixedExpenses={fixedExpenses}
          catLabel={catLabel}
          onQuickAdd={openExpense}
          onRemove={removeExpense}
          onSave={handleSaveOnboarding}
          formatMoney={formatMoney}
          t={t}
          isRTL={isRTL}
        />
      ) : (
        <>
          {error && (
            <div className="analytics-error-wrap">
              <ErrorBox message={error} onRetry={load} />
            </div>
          )}

          {/* Health Score */}
          <div className="analytics-health-card">
            <span className="analytics-card-label">{t('healthScore')}</span>
            <HealthRing score={health.score} />
            {health.deficit && (
              <p className="analytics-health-note">
                {t('deficit')}: {formatMoney(Math.abs(health.surplus))} <RiyalSymbol size="0.75em" /> / {t('monthlyIncome')}
              </p>
            )}
          </div>

          {/* Budget Breakdown */}
          <div className="analytics-breakdown-head">
            <SectionTitle icon={BarChart2}>{t('budgetBreakdown')}</SectionTitle>
            <button
              className="analytics-edit-btn"
              onClick={() => {
                setIncomeInput(String(monthlyIncome))
                setEditSheet(true)
              }}
              aria-label={t('edit')}
            >
              <Edit2 size={14} />
              {t('edit')}
            </button>
          </div>
          <BudgetBreakdown
            income={monthlyIncome}
            fixed={totalFixedExpenses}
            variable={monthlySpent}
            formatMoney={formatMoney}
            t={t}
            isRTL={isRTL}
          />

          {/* Spending trajectory + monthly trend charts */}
          <SectionTitle icon={TrendingUp}>{t('spendingCharts')}</SectionTitle>
          <SpendingTrendChart series={dailySeries} t={t} isRTL={isRTL} />
          <MonthlyBarsChart series={monthlySeries} t={t} lang={lang} isRTL={isRTL} />
          {categorySeries.total > 0 && (
            <CategoryDonut series={categorySeries} t={t} formatMoney={formatMoney} />
          )}

          {/* Spending Stats */}
          <SectionTitle icon={PieChart}>{t('spendingBreakdown')}</SectionTitle>
          <div className="analytics-stats-row">
            <StatCard
              label={t('totalSent')}
              value={`${formatMoney(stats.totalSent)}`}
              Icon={ArrowUpRight}
              color="var(--gold)"
            />
            <StatCard
              label={t('totalBlocked')}
              value={`${formatMoney(stats.totalBlocked)}`}
              Icon={Shield}
              color="var(--danger)"
            />
          </div>
          <div className="analytics-stats-row" style={{ marginBlockStart: 'var(--sp-3)' }}>
            <StatCard
              label={t('avgTransfer')}
              value={`${formatMoney(stats.avgTransfer)}`}
              Icon={TrendingUp}
              color="var(--teal-light)"
            />
            <StatCard
              label={t('recentTransactions')}
              value={`${stats.sentCount + stats.blockedCount}`}
              Icon={List}
              color="var(--text-muted)"
            />
          </div>

          {/* AI Insights */}
          {data?.insights?.length > 0 && (
            <>
              <SectionTitle icon={Zap}>{t('aiInsights')}</SectionTitle>
              <div className="analytics-insight-card">
                {data.insights.map((ins, i) => (
                  <div key={i} className="analytics-insight-line">
                    <div className="analytics-insight-dot">
                      <ArrowUpRight size={14} color="var(--gold)" />
                    </div>
                    <p className="analytics-insight-text">
                      {ins}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Month-end Prediction (live from the forecast) */}
          <SectionTitle icon={Calendar}>{t('monthEndPrediction')}</SectionTitle>
          <div className="analytics-predict-card">
            <span className="analytics-predict-icon">
              <TrendingDown size={20} color="var(--teal-light)" />
            </span>
            <div className="analytics-predict-body">
              <p className="analytics-predict-text">
                {forecast.projectedRemainingSpend > 0
                  ? t('forecastSpendNote').replace('{n}', formatMoney(forecast.projectedRemainingSpend))
                  : t('forecastSubtitle')}
              </p>
              <div className="analytics-predict-value">
                {formatMoney(forecast.predictedMonthEndBalance)} <RiyalSymbol size="0.8em" />
              </div>
            </div>
          </div>

          {/* Risk History */}
          <SectionTitle icon={BarChart2}>{t('riskHistory')}</SectionTitle>
          {sortedByRisk.length === 0 ? (
            <div className="analytics-empty">
              <Inbox size={26} />
              <span>{t('noTransactions')}</span>
            </div>
          ) : (
            <div className="analytics-risk-card">
              {sortedByRisk.map((tx) => {
                const c = riskColorByScore(tx.riskScore)
                return (
                  <div key={tx.id} className="analytics-risk-row">
                    <span
                      className="analytics-risk-name"
                      title={tx.beneficiary || '—'}
                    >
                      {tx.beneficiary || '—'}
                    </span>
                    <div className="analytics-risk-track">
                      <div
                        className="analytics-risk-fill"
                        style={{ width: `${tx.riskScore}%`, backgroundColor: c }}
                      />
                    </div>
                    <span className="analytics-risk-score" style={{ color: c }}>
                      {tx.riskScore}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Edit Financials bottom sheet ── */}
      <EditFinancialsModal
        visible={editSheet}
        onClose={() => setEditSheet(false)}
        incomeInput={incomeInput}
        setIncomeInput={setIncomeInput}
        fixedExpenses={fixedExpenses}
        catLabel={catLabel}
        formatMoney={formatMoney}
        onRemove={removeExpense}
        onAddExpense={() => setExpenseModal(true)}
        onSave={handleSaveEditSheet}
        t={t}
        isRTL={isRTL}
      />

      {/* ── Add Expense bottom sheet ── */}
      <ExpenseModal
        visible={Boolean(expenseModal)}
        preset={typeof expenseModal === 'object' ? expenseModal : null}
        onClose={() => setExpenseModal(false)}
        onSave={handleSaveExpense}
        t={t}
        isRTL={isRTL}
      />
    </div>
  )
}
