import React, { useState, useEffect, useRef } from 'react'
import { X, ShieldAlert, Check } from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import { reportFraud, CATEGORIES } from '../store/community'
import RiyalSymbol from './RiyalSymbol'
import './ReportFraudModal.css'

export default function ReportFraudModal({ visible, onClose, onReported, prefill }) {
  const { t, isRTL } = useAccount()
  const [payee, setPayee] = useState('')
  const [iban, setIban] = useState('')
  const [category, setCategory] = useState('other')
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [done, setDone] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => {
    if (visible) {
      setPayee(prefill?.payee || '')
      setIban(prefill?.iban || '')
      setCategory(prefill?.category || 'other')
      setReason('')
      setAmount(prefill?.amount ? String(prefill.amount) : '')
      setDone(false)
      setTimeout(() => nameRef.current?.focus(), 120)
    }
  }, [visible, prefill])

  useEffect(() => {
    if (!visible) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [visible, onClose])

  if (!visible) return null

  const submit = () => {
    if (!payee.trim()) return
    const network = reportFraud({
      payee: payee.trim(),
      iban: iban.trim(),
      category,
      reason: reason.trim(),
      amount: Number(amount) || 0,
      reporterName: t('reporterYou'),
    })
    setDone(true)
    onReported?.(network)
    setTimeout(onClose, 1100)
  }

  const overlayClick = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className="rfm-overlay" onClick={overlayClick} role="dialog" aria-modal="true" aria-label={t('reportFraudTitle')}>
      <div className="rfm-sheet">
        {done ? (
          <div className="rfm-done">
            <span className="rfm-done-icon"><Check size={30} color="var(--success-bright)" /></span>
            <p className="rfm-done-title">{t('reportThanks')}</p>
          </div>
        ) : (
          <>
            <div className="rfm-header">
              <span className="rfm-title"><ShieldAlert size={18} color="var(--danger)" /> {t('reportFraudTitle')}</span>
              <button className="rfm-close" onClick={onClose} aria-label={t('dismiss')}><X size={18} color="var(--text-muted)" /></button>
            </div>
            <p className="rfm-intro">{t('reportFraudIntro')}</p>

            <label className="rfm-label">{t('reportPayeeName')}</label>
            <input ref={nameRef} className="input" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder={t('reportPayeeName')} />

            <label className="rfm-label">{t('reportIban')}</label>
            <input className="input" value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} placeholder="SA…" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: 'start' }} />

            <label className="rfm-label">{t('reportCategory')}</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat_${c}`)}</option>)}
            </select>

            <label className="rfm-label">{t('reportReason')}</label>
            <textarea className="input rfm-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('reportReasonPlaceholder')} rows={3} />

            <label className="rfm-label">{t('reportAmount')}</label>
            <div className="rfm-amount-wrap">
              <input className="input" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" dir={isRTL ? 'rtl' : 'ltr'} />
              <span className="rfm-amount-unit"><RiyalSymbol size="0.85em" /></span>
            </div>

            <button className="btn btn-danger btn-full rfm-submit" onClick={submit} disabled={!payee.trim()}>
              <ShieldAlert size={16} /> {t('reportSubmit')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
