import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Globe,
  CreditCard,
  Info,
  LogOut,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  DollarSign,
  X,
  Edit2,
} from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import { SectionTitle } from '../components/ui'
import './SettingsPage.css'

/* ── Expense category map ── */
const CATEGORY_KEYS = ['catRent', 'catUtilities', 'catSubscription', 'catTransport', 'catOther']
const CAT_VALUES    = ['rent', 'utilities', 'subscription', 'transport', 'other']

/* ── Quick-add suggestion chips ── */
const SUGGESTIONS = [
  { nameKey: 'sugRent',        nameEnKey: 'sugRent',        cat: 'rent' },
  { nameKey: 'sugElectricity', nameEnKey: 'sugElectricity', cat: 'utilities' },
  { nameKey: 'sugWater',       nameEnKey: 'sugWater',       cat: 'utilities' },
  { nameKey: 'sugInternet',    nameEnKey: 'sugInternet',    cat: 'subscription' },
  { nameKey: 'sugCar',         nameEnKey: 'sugCar',         cat: 'transport' },
  { nameKey: 'sugInsurance',   nameEnKey: 'sugInsurance',   cat: 'other' },
]

/* ── Empty form state ── */
const emptyForm = () => ({ name: '', amount: '', category: 'other' })

export default function SettingsPage() {
  const {
    balance,
    formatMoney,
    resetAccount,
    logout,
    userName,
    memberSince,
    lang,
    toggleLang,
    t,
    isRTL,
    monthlyIncome,
    fixedExpenses,
    totalFixedExpenses,
    saveMonthlyIncome,
    addExpense,
    removeExpense,
    editExpense,
  } = useAccount()
  const navigate = useNavigate()

  const memberSinceDate = memberSince ? memberSince.slice(0, 10) : ''

  /* ── Income editor ── */
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeVal, setIncomeVal] = useState('')
  const [incomeSaved, setIncomeSaved] = useState(false)

  const startEditIncome = () => {
    setIncomeVal(monthlyIncome > 0 ? String(monthlyIncome) : '')
    setEditingIncome(true)
    setIncomeSaved(false)
  }

  const saveIncome = useCallback(async () => {
    const v = parseFloat(incomeVal) || 0
    await saveMonthlyIncome(v)
    setEditingIncome(false)
    setIncomeSaved(true)
    setTimeout(() => setIncomeSaved(false), 2000)
  }, [incomeVal, saveMonthlyIncome])

  /* ── Add/edit expense form ── */
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [formErr, setFormErr] = useState('')
  const [formBusy, setFormBusy] = useState(false)

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormErr('')
    setShowForm(true)
  }

  const openEdit = (exp) => {
    setEditingId(exp.id)
    setForm({ name: exp.name || exp.nameEn || '', amount: String(exp.amount || ''), category: exp.category || 'other' })
    setFormErr('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormErr('')
  }

  const applySuggestion = (sug) => {
    setForm((f) => ({ ...f, name: t(sug.nameKey), category: sug.cat }))
  }

  const submitForm = useCallback(async () => {
    if (formBusy) return
    const name = form.name.trim()
    const amount = parseFloat(form.amount) || 0
    if (!name) return setFormErr(t('expenseName') + ' ' + t('errNameMin'))
    if (amount <= 0) return setFormErr(t('expenseAmount'))
    setFormBusy(true)
    try {
      const payload = { name, nameEn: name, amount, category: form.category }
      if (editingId) {
        await editExpense(editingId, payload)
      } else {
        await addExpense(payload)
      }
      closeForm()
    } catch {
      setFormErr(t('error'))
    } finally {
      setFormBusy(false)
    }
  }, [formBusy, form, editingId, addExpense, editExpense, t])

  /* ── Delete expense ── */
  const handleDelete = useCallback(async (id) => {
    if (!window.confirm(t('resetAccount') + '?')) return
    await removeExpense(id)
  }, [removeExpense, t])

  /* ── Reset account ── */
  const confirmReset = useCallback(() => {
    if (!window.confirm(t('resetAccount'))) return
    resetAccount()
  }, [resetAccount, t])

  /* ── Sign out ── */
  const confirmSignOut = useCallback(async () => {
    if (!window.confirm(t('confirmSignOut'))) return
    await logout()
    navigate('/auth', { replace: true })
  }, [logout, navigate, t])

  return (
    <div className="settings-scroll page-scroll">
      <h1 className="settings-h1">{t('tabSettings')}</h1>

      {/* Account card */}
      <div className="settings-user-card card-light">
        <div className="settings-avatar">
          <User size={24} color="var(--gold)" />
        </div>
        <div className="settings-user-info">
          <span className="settings-user-name">{userName || '—'}</span>
          {memberSinceDate && (
            <span className="settings-user-since">
              {t('memberSince')} {memberSinceDate}
            </span>
          )}
        </div>
      </div>

      {/* Financial Profile */}
      <SectionTitle icon={DollarSign}>{t('financialProfile')}</SectionTitle>
      <div className="card">
        <p className="settings-profile-desc">{t('financialProfileDesc')}</p>

        {/* Monthly income row */}
        <div className="settings-income-row">
          <span className="settings-income-label">{t('monthlyIncome')}</span>
          {editingIncome ? (
            <div className="settings-income-edit">
              <input
                className="input settings-income-input"
                type="number"
                min="0"
                value={incomeVal}
                onChange={(e) => setIncomeVal(e.target.value)}
                placeholder="0"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveIncome()}
                dir="ltr"
              />
              <button className="btn btn-gold btn-sm" onClick={saveIncome}>{t('save')}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingIncome(false)}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="settings-income-display">
              {monthlyIncome > 0 ? (
                <span className="settings-income-value text-gold">
                  {formatMoney(monthlyIncome)} {t('currency')}
                </span>
              ) : (
                <span className="text-hint text-sm">—</span>
              )}
              {incomeSaved && <Check size={14} color="var(--success)" />}
              <button className="btn btn-ghost btn-sm" onClick={startEditIncome}>
                <Edit2 size={14} />
                {monthlyIncome > 0 ? t('edit') : t('addExpense')}
              </button>
            </div>
          )}
        </div>

        {/* Fixed expenses total */}
        {fixedExpenses.length > 0 && (
          <div className="settings-fixed-total">
            <span className="text-muted text-sm">{t('totalFixedExpenses')}</span>
            <span className="text-gold font-bold text-sm">
              {formatMoney(totalFixedExpenses)} {t('currency')}
            </span>
          </div>
        )}

        {/* Expense list */}
        <div className="settings-expenses-label">
          <span className="text-muted text-sm">{t('fixedExpenses')}</span>
        </div>

        {fixedExpenses.length === 0 ? (
          <p className="settings-no-expenses text-hint text-sm">{t('noFixedExpenses')}</p>
        ) : (
          <ul className="settings-expense-list">
            {fixedExpenses.map((exp) => (
              <li key={exp.id} className="settings-expense-item">
                <div className="settings-expense-info">
                  <span className="settings-expense-name">{exp.name}</span>
                  {exp.category && (
                    <span className="chip text-xs">{t(`cat${cap(exp.category)}`)}</span>
                  )}
                </div>
                <div className="settings-expense-right">
                  <span className="settings-expense-amount">
                    {formatMoney(exp.amount)} {t('currency')}
                  </span>
                  <button
                    className="settings-icon-btn"
                    onClick={() => openEdit(exp)}
                    aria-label={t('edit')}
                  >
                    <Edit2 size={14} color="var(--text-muted)" />
                  </button>
                  <button
                    className="settings-icon-btn settings-icon-btn--danger"
                    onClick={() => handleDelete(exp.id)}
                    aria-label={t('resetAccount')}
                  >
                    <Trash2 size={14} color="var(--danger)" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Add expense button */}
        {!showForm && (
          <button className="btn btn-ghost btn-sm settings-add-btn" onClick={openAdd}>
            <Plus size={14} />
            {t('addExpense')}
          </button>
        )}

        {/* Add/edit form inline */}
        {showForm && (
          <div className="settings-expense-form">
            <div className="settings-expense-form-header">
              <span className="font-bold text-sm">
                {editingId ? t('edit') : t('newExpense')}
              </span>
              <button className="settings-icon-btn" onClick={closeForm}>
                <X size={16} color="var(--text-muted)" />
              </button>
            </div>

            {/* Suggestion chips */}
            {!editingId && (
              <div className="settings-suggestions">
                <span className="text-hint text-xs">{t('suggestions')}</span>
                <div className="settings-chips-wrap">
                  {SUGGESTIONS.map((sug) => (
                    <button
                      key={sug.nameKey}
                      className="chip chip-clickable"
                      onClick={() => applySuggestion(sug)}
                      type="button"
                    >
                      {t(sug.nameKey)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input
              className="input"
              placeholder={t('expenseName')}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={{ marginBlockEnd: 'var(--sp-3)' }}
            />

            <input
              className="input"
              type="number"
              min="0"
              placeholder={t('expenseAmount')}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              style={{ marginBlockEnd: 'var(--sp-3)' }}
              dir="ltr"
            />

            {/* Category select */}
            <select
              className="input settings-category-select"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              style={{ marginBlockEnd: 'var(--sp-3)' }}
            >
              {CAT_VALUES.map((val, i) => (
                <option key={val} value={val}>{t(CATEGORY_KEYS[i])}</option>
              ))}
            </select>

            {formErr && (
              <p className="text-danger text-sm" style={{ marginBlockEnd: 'var(--sp-3)' }}>
                {formErr}
              </p>
            )}

            <div className="settings-form-actions">
              <button
                className="btn btn-gold btn-sm"
                onClick={submitForm}
                disabled={formBusy}
              >
                {formBusy ? <span className="spinner" style={{ width: 14, height: 14 }} /> : t('save')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={closeForm} disabled={formBusy}>
                {t('cancelTransfer')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Language */}
      <SectionTitle icon={Globe}>{t('language')}</SectionTitle>
      <div className="card">
        <div className="settings-lang-row">
          <LangBtn label="العربية" active={lang === 'ar'} onPress={() => lang !== 'ar' && toggleLang()} />
          <LangBtn label="English" active={lang === 'en'} onPress={() => lang !== 'en' && toggleLang()} />
        </div>
      </div>

      {/* Account */}
      <SectionTitle icon={CreditCard}>{t('account')}</SectionTitle>
      <div className="card">
        <div className="settings-acc-row">
          <span className="text-muted">{t('balance')}</span>
          <span className="text-gold font-bold">
            {formatMoney(balance)} {t('currency')}
          </span>
        </div>
        <button className="btn btn-danger btn-full" onClick={confirmReset}>
          <RefreshCw size={16} />
          {t('resetAccount')}
        </button>
      </div>

      {/* About */}
      <SectionTitle icon={Info}>{t('aboutTahseen')}</SectionTitle>
      <div className="card">
        <p className="settings-about-text">{t('aboutText')}</p>
      </div>

      {/* Sign out */}
      <button className="btn btn-danger btn-full settings-sign-out" onClick={confirmSignOut}>
        <LogOut size={18} />
        {t('signOut')}
      </button>
    </div>
  )
}

function LangBtn({ label, active, onPress }) {
  return (
    <button
      className={`settings-lang-btn${active ? ' settings-lang-btn--active' : ''}`}
      onClick={onPress}
      type="button"
    >
      {label}
    </button>
  )
}

/* capitalize first char */
function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
}
