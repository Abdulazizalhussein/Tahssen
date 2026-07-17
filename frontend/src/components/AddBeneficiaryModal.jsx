// ─────────────────────────────────────────────────────────────────
//  AddBeneficiaryModal — port of src/components/AddBeneficiaryModal.js
//  Bottom-sheet overlay, name (required), IBAN (optional),
//  bank chip selector (optional), busy guard, calls addBeneficiary
// ─────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react'
import { X, User, CreditCard } from 'lucide-react'
import { useAccount } from '../store/AccountContext'

const BANKS = [
  'الإنماء',
  'الراجحي',
  'الأهلي',
  'الرياض',
  'سامبا',
  'البلاد',
  'الجزيرة',
  'الفرنسي',
  'ساب',
  'ستاندرد',
]

// Scoped styles are injected once as a <style> tag rather than a separate
// .css file, keeping the component fully self-contained per the contract
// (only BeneficiariesPage.css is our owned CSS file).
const STYLES = `
.abn-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9000;
  padding: 0;
  animation: abn-fade-in 180ms ease;
}

@keyframes abn-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.abn-sheet {
  background: var(--bg-card);
  border-start-start-radius: var(--radius-xl);
  border-start-end-radius: var(--radius-xl);
  padding: 22px 22px 36px;
  width: 100%;
  max-width: 560px;
  max-height: 88dvh;
  overflow-y: auto;
  border-block-start: 1px solid var(--border-light);
  box-shadow: var(--shadow-elevated);
  animation: abn-slide-up 220ms ease;
}

@keyframes abn-slide-up {
  from { transform: translateY(40px); opacity: 0.6; }
  to   { transform: translateY(0);    opacity: 1; }
}

.abn-drag-handle {
  width: 36px;
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--border-light);
  margin: 0 auto var(--sp-5);
}

.abn-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-block-end: var(--sp-5);
}

.abn-title {
  color: var(--text);
  font-size: 18px;
  font-weight: 800;
}

.abn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius);
  border: none;
  background: var(--bg-card-light);
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
}

.abn-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
}

.abn-close:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.abn-field-label {
  display: block;
  color: var(--text-muted);
  font-size: 13px;
  margin-block-end: var(--sp-2);
  text-align: start;
}

.abn-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius);
  padding-inline: 14px;
  border: 1px solid var(--border-light);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.abn-input-wrap:focus-within {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px var(--gold-dim);
}

.abn-input-wrap svg {
  color: var(--text-muted);
  flex-shrink: 0;
}

.abn-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 15px;
  font-family: var(--font);
  padding-block: 13px;
  outline: none;
  min-width: 0;
  text-align: start;
}

.abn-input::placeholder {
  color: var(--text-hint);
}

.abn-field-gap {
  margin-block-start: 14px;
}

.abn-bank-scroll {
  display: flex;
  gap: var(--sp-2);
  overflow-x: auto;
  padding-block: var(--sp-1);
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.abn-bank-scroll::-webkit-scrollbar {
  display: none;
}

.abn-bank-chip {
  display: inline-flex;
  align-items: center;
  padding: 9px 14px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background var(--transition), border-color var(--transition), color var(--transition);
  user-select: none;
}

.abn-bank-chip:hover:not(.abn-bank-chip--active) {
  background: rgba(255, 255, 255, 0.09);
  color: var(--text);
}

.abn-bank-chip--active {
  background: var(--teal);
  border-color: var(--teal);
  color: #fff;
}

.abn-bank-chip:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.abn-save-btn {
  width: 100%;
  height: 52px;
  background: var(--teal);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  margin-block-start: 22px;
  transition: background var(--transition), opacity var(--transition), transform var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
}

.abn-save-btn:hover:not(:disabled) {
  background: var(--teal-light);
}

.abn-save-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.abn-save-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.abn-save-btn:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}

.abn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: abn-spin 0.65s linear infinite;
}

@keyframes abn-spin {
  to { transform: rotate(360deg); }
}
`

let stylesInjected = false

function injectStyles() {
  if (stylesInjected) return
  const el = document.createElement('style')
  el.textContent = STYLES
  document.head.appendChild(el)
  stylesInjected = true
}

export default function AddBeneficiaryModal({ visible, onClose, onSaved }) {
  injectStyles()

  const { t, isRTL, addBeneficiary } = useAccount()
  const [name, setName] = useState('')
  const [iban, setIban] = useState('')
  const [bank, setBank] = useState('')
  const [busy, setBusy] = useState(false)
  const overlayRef = useRef(null)
  const nameInputRef = useRef(null)

  // Auto-focus name field when opened
  useEffect(() => {
    if (visible) {
      setTimeout(() => nameInputRef.current?.focus(), 60)
    }
  }, [visible])

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    function onKey(e) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll while open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [visible])

  function reset() {
    setName('')
    setIban('')
    setBank('')
    setBusy(false)
  }

  function close() {
    reset()
    onClose()
  }

  async function save() {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await addBeneficiary({ name: name.trim(), iban: iban.trim(), bank: bank.trim() })
      onSaved?.(name.trim())
      reset()
      onClose()
    } catch {
      setBusy(false)
    }
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) close()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) save()
  }

  if (!visible) return null

  return (
    <div
      className="abn-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={t('newBeneficiary')}
    >
      <div className="abn-sheet">
        {/* Drag handle */}
        <div className="abn-drag-handle" aria-hidden="true" />

        {/* Header */}
        <div className="abn-head">
          <h2 className="abn-title">{t('newBeneficiary')}</h2>
          <button className="abn-close" onClick={close} type="button" aria-label={t('dismiss')}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Name field (required) */}
        <label className="abn-field-label" htmlFor="abn-name">
          {t('benName')}
        </label>
        <div className="abn-input-wrap">
          <User size={18} aria-hidden="true" />
          <input
            id="abn-name"
            ref={nameInputRef}
            className="abn-input"
            type="text"
            placeholder={t('benName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="name"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>

        {/* IBAN field (optional) */}
        <div className="abn-field-gap">
          <label className="abn-field-label" htmlFor="abn-iban">
            {t('benIban')}
          </label>
          <div className="abn-input-wrap">
            <CreditCard size={18} aria-hidden="true" />
            <input
              id="abn-iban"
              className="abn-input"
              type="text"
              placeholder="SA00 0000 0000 0000 0000 0000"
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              dir={isRTL ? 'rtl' : 'ltr'}
              style={{ textAlign: 'start' }}
            />
          </div>
        </div>

        {/* Bank chip selector (optional) */}
        <div className="abn-field-gap">
          <span className="abn-field-label">{t('benBank')}</span>
          <div className="abn-bank-scroll" role="group" aria-label={t('benBank')}>
            {BANKS.map((b) => {
              const active = bank === b
              return (
                <button
                  key={b}
                  type="button"
                  className={`abn-bank-chip${active ? ' abn-bank-chip--active' : ''}`}
                  onClick={() => setBank(active ? '' : b)}
                  aria-pressed={active}
                >
                  {b}
                </button>
              )
            })}
          </div>
        </div>

        {/* Save button */}
        <button
          className="abn-save-btn"
          type="button"
          onClick={save}
          disabled={!name.trim() || busy}
          aria-busy={busy}
        >
          {busy ? <span className="abn-spinner" aria-hidden="true" /> : null}
          {t('save')}
        </button>
      </div>
    </div>
  )
}
