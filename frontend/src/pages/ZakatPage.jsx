import React, { useMemo, useState, useEffect } from 'react'
import { HandCoins, Wallet, Coins, TrendingUp, PlusCircle, MinusCircle, Info, RotateCcw } from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import { SectionTitle } from '../components/ui'
import RiyalSymbol from '../components/RiyalSymbol'
import './ZakatPage.css'

const STORE_KEY = 'tahseen.zakat.v1'
const NISAB_GOLD_GRAMS = 85 // nisab = value of 85g of 24k gold
const ZAKAT_RATE = 0.025 // 2.5%
const DEFAULT_GOLD_PRICE = 375 // SAR per gram, 24k — editable

// Persisted inputs (gold price + asset figures). Cash is seeded from balance
// the first time so the user starts from something real.
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export default function ZakatPage() {
  const { balance, formatMoney, t, lang, isRTL } = useAccount()
  const saved = useMemo(loadState, [])

  const [cash, setCash] = useState(() => (saved?.cash != null ? String(saved.cash) : String(Math.round(balance || 0))))
  const [goldGrams, setGoldGrams] = useState(() => (saved?.goldGrams != null ? String(saved.goldGrams) : ''))
  const [investments, setInvestments] = useState(() => (saved?.investments != null ? String(saved.investments) : ''))
  const [other, setOther] = useState(() => (saved?.other != null ? String(saved.other) : ''))
  const [debts, setDebts] = useState(() => (saved?.debts != null ? String(saved.debts) : ''))
  const [goldPrice, setGoldPrice] = useState(() => String(saved?.goldPrice ?? DEFAULT_GOLD_PRICE))

  useEffect(() => {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ cash: num(cash), goldGrams: num(goldGrams), investments: num(investments), other: num(other), debts: num(debts), goldPrice: num(goldPrice) || DEFAULT_GOLD_PRICE })
      )
    } catch { /* ignore quota */ }
  }, [cash, goldGrams, investments, other, debts, goldPrice])

  const price = num(goldPrice) || DEFAULT_GOLD_PRICE
  const goldValue = num(goldGrams) * price
  const netWealth = Math.max(0, num(cash) + goldValue + num(investments) + num(other) - num(debts))
  const nisab = NISAB_GOLD_GRAMS * price
  const meetsNisab = netWealth >= nisab && netWealth > 0
  const due = meetsNisab ? netWealth * ZAKAT_RATE : 0

  const reset = () => {
    setCash(String(Math.round(balance || 0)))
    setGoldGrams(''); setInvestments(''); setOther(''); setDebts('')
    setGoldPrice(String(DEFAULT_GOLD_PRICE))
  }

  return (
    <div className="page-scroll zakat-page">
      <div className="zakat-head">
        <span className="zakat-head-icon"><HandCoins size={22} color="var(--gold)" /></span>
        <div>
          <h1 className="zakat-title">{t('zakatCalculator')}</h1>
          <p className="zakat-intro">{t('zakatIntro')}</p>
        </div>
      </div>

      {/* Hero result */}
      <div className={`zakat-hero${meetsNisab ? ' due' : ' clear'}`}>
        <span className="zakat-hero-label">{t('zakatDue')}</span>
        <div className="zakat-hero-amount">
          {formatMoney(due)} <RiyalSymbol size="0.55em" />
        </div>
        <div className={`zakat-status-pill ${meetsNisab ? 'due' : 'clear'}`}>
          {meetsNisab ? t('zakatAboveNisab') : t('zakatBelowNisab')}
        </div>
      </div>

      {/* Asset inputs */}
      <SectionTitle icon={Wallet}>{t('zakatableAssets')}</SectionTitle>
      <div className="card zakat-card">
        <Field icon={Wallet} label={t('zakatCashLabel')} hint={t('zakatCashHint')} value={cash} onChange={setCash} suffix />
        <Field icon={Coins} label={t('zakatGoldGrams')} hint={t('zakatGoldHint')} value={goldGrams} onChange={setGoldGrams} unit={lang === 'ar' ? 'جم' : 'g'} />
        <Field icon={TrendingUp} label={t('zakatInvestments')} value={investments} onChange={setInvestments} suffix />
        <Field icon={PlusCircle} label={t('zakatOtherAssets')} value={other} onChange={setOther} suffix />
        <Field icon={MinusCircle} label={t('zakatDebts')} value={debts} onChange={setDebts} suffix danger />
      </div>

      {/* Nisab config */}
      <SectionTitle icon={Coins}>{t('zakatNisab')}</SectionTitle>
      <div className="card zakat-card">
        <Field icon={Coins} label={t('zakatGoldPrice')} hint={t('zakatGoldPriceHint')} value={goldPrice} onChange={setGoldPrice} suffix />
      </div>

      {/* Breakdown */}
      <div className="card zakat-breakdown">
        <Row label={t('zakatNetWealth')} value={<><RiyalMoney formatMoney={formatMoney} value={netWealth} /></>} strong />
        <div className="zakat-sep" />
        <Row label={t('zakatNisab')} value={<RiyalMoney formatMoney={formatMoney} value={nisab} />} />
        <Row label={t('zakatRate')} value="2.5%" />
        <div className="zakat-sep" />
        <Row label={t('zakatDue')} value={<span className={meetsNisab ? 'text-gold' : 'text-hint'}><RiyalMoney formatMoney={formatMoney} value={due} /></span>} strong />
      </div>

      <div className="zakat-note">
        <Info size={15} color="var(--gold)" style={{ flexShrink: 0, marginBlockStart: 2 }} />
        <div>
          <p className="zakat-note-line">{t('zakatHawlNote')}</p>
          <p className="zakat-note-line zakat-note-muted">{t('zakatDisclaimer')}</p>
        </div>
      </div>

      <button className="btn btn-ghost btn-full zakat-reset" onClick={reset} type="button">
        <RotateCcw size={16} /> {t('zakatResetInputs')}
      </button>
    </div>
  )
}

function Field({ icon: Icon, label, hint, value, onChange, unit, suffix, danger }) {
  return (
    <div className="zakat-field">
      <label className="zakat-field-label">
        <Icon size={15} color={danger ? 'var(--danger)' : 'var(--gold)'} aria-hidden="true" />
        {label}
      </label>
      <div className="zakat-input-wrap">
        <input
          className="input zakat-input"
          type="number"
          inputMode="decimal"
          min="0"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
        />
        <span className="zakat-input-unit">
          {suffix ? <RiyalSymbol size="0.85em" /> : unit}
        </span>
      </div>
      {hint ? <p className="zakat-field-hint">{hint}</p> : null}
    </div>
  )
}

function RiyalMoney({ formatMoney, value }) {
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      {formatMoney(value)} <RiyalSymbol size="0.8em" />
    </span>
  )
}

function Row({ label, value, strong }) {
  return (
    <div className={`zakat-row${strong ? ' strong' : ''}`}>
      <span className="zakat-row-label">{label}</span>
      <span className="zakat-row-value">{value}</span>
    </div>
  )
}
