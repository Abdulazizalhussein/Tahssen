// ─────────────────────────────────────────────────────────────────
//  BeneficiariesPage — port of src/screens/BeneficiariesScreen.js
//  Active/Blocked tabs, beneficiary cards, unblock with confirm,
//  relative date labels, initials avatar, empty states, back button
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Plus, Ban, Unlock, Users, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import { lookupPayee } from '../store/community'
import AddBeneficiaryModal from '../components/AddBeneficiaryModal'
import './BeneficiariesPage.css'

// ── Helpers ──────────────────────────────────────────────────────

function formatDate(ms, lang) {
  if (!ms) return null
  const d = new Date(ms)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(d, today)) return lang === 'ar' ? 'اليوم' : 'Today'
  if (sameDay(d, yesterday)) return lang === 'ar' ? 'أمس' : 'Yesterday'
  return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    day: 'numeric',
    month: 'short',
  })
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── Sub-components ────────────────────────────────────────────────

function TabBtn({ label, active, onClick }) {
  return (
    <button
      className={`ben-tab${active ? ' ben-tab--active' : ''}`}
      onClick={onClick}
      type="button"
      aria-pressed={active}
    >
      {label}
    </button>
  )
}

function ActiveCard({ b, t, lang }) {
  const date = formatDate(b.lastTransferAt, lang)
  const sub = date
    ? `${t('benLastTransfer')}: ${date}${b.transferCount ? `  ×${b.transferCount}` : ''}`
    : t('benNoTransferYet')
  // Community risk status for this payee (drives the badge).
  const risk = lookupPayee(b.name, b.iban)

  return (
    <article className="ben-card-active" aria-label={b.name}>
      <div className="ben-avatar ben-avatar--active" aria-hidden="true">
        <span className="ben-initials">{getInitials(b.name)}</span>
      </div>
      <div className="ben-card-body">
        <div className="ben-card-name-row">
          <span className="ben-card-name">{b.name}</span>
          {risk.found ? (
            <span className="ben-risk-badge danger"><ShieldAlert size={12} /> {t('benRiskFlag')}</span>
          ) : (
            <span className="ben-risk-badge safe"><ShieldCheck size={12} /> {t('benSafeFlag')}</span>
          )}
        </div>
        <div className="ben-card-sub">{sub}</div>
        {!!b.bank && <div className="ben-card-bank">{b.bank}</div>}
      </div>
    </article>
  )
}

function BlockedCard({ b, t, onUnblock }) {
  return (
    <article className="ben-card-blocked" aria-label={b.name}>
      <div className="ben-blocked-top">
        <div className="ben-avatar ben-avatar--blocked" aria-hidden="true">
          <Ban size={20} />
        </div>
        <div className="ben-card-body">
          <div className="ben-card-name">{b.name}</div>
          <div className="ben-blocked-reason">
            {t('benBlockedLabel')}: {b.blockedReason || t('benBlockedLabel')}
          </div>
        </div>
      </div>
      <button className="ben-unblock-btn" onClick={onUnblock} type="button">
        <Unlock size={15} aria-hidden="true" />
        {t('benUnblock')}
      </button>
    </article>
  )
}

// ── Page ─────────────────────────────────────────────────────────

export default function BeneficiariesPage() {
  const navigate = useNavigate()
  const { beneficiaries, unblockBeneficiaryAction, t, isRTL, lang } = useAccount()
  const [tab, setTab] = useState('active')
  const [modalOpen, setModalOpen] = useState(false)

  const active = beneficiaries.filter((b) => b.status === 'active')
  const blocked = beneficiaries.filter((b) => b.status === 'blocked')
  const list = tab === 'active' ? active : blocked

  function handleUnblock(id) {
    const ok = window.confirm(t('benUnblock') + '?')
    if (ok) unblockBeneficiaryAction(id)
  }

  // RTL: back arrow flips direction
  const BackIcon = isRTL ? ArrowRight : ArrowLeft

  return (
    <main className="ben-page">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="ben-header">
        <div className="ben-title-row">
          <button
            className="ben-back-btn"
            onClick={() => navigate(-1)}
            aria-label={isRTL ? 'رجوع' : 'Back'}
            type="button"
          >
            <BackIcon size={20} aria-hidden="true" />
          </button>
          <h1 className="ben-h1">{t('beneficiaries')}</h1>
        </div>

        <button
          className="ben-add-btn"
          onClick={() => setModalOpen(true)}
          type="button"
          aria-label={t('addBeneficiary')}
        >
          <Plus size={15} aria-hidden="true" />
          {t('addBeneficiary')}
        </button>
      </header>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <nav className="ben-tabs" aria-label={isRTL ? 'تصفية المستفيدين' : 'Filter beneficiaries'}>
        <TabBtn
          label={`${t('benActive')} (${active.length})`}
          active={tab === 'active'}
          onClick={() => setTab('active')}
        />
        <TabBtn
          label={`${t('benBlocked')} (${blocked.length})`}
          active={tab === 'blocked'}
          onClick={() => setTab('blocked')}
        />
      </nav>

      {/* ── List / Empty state ───────────────────────────────── */}
      {list.length === 0 ? (
        <div className="ben-empty" role="status" aria-live="polite">
          {tab === 'active' ? (
            <Users size={32} aria-hidden="true" />
          ) : (
            <Ban size={32} aria-hidden="true" />
          )}
          <p className="ben-empty-text">
            {tab === 'active' ? t('benNoActive') : t('benNoBlocked')}
          </p>
        </div>
      ) : (
        <div className="ben-list">
          {list.map((b) =>
            b.status === 'active' ? (
              <ActiveCard key={b.id} b={b} t={t} lang={lang} />
            ) : (
              <BlockedCard
                key={b.id}
                b={b}
                t={t}
                onUnblock={() => handleUnblock(b.id)}
              />
            )
          )}
        </div>
      )}

      {/* ── Add Modal ───────────────────────────────────────── */}
      <AddBeneficiaryModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </main>
  )
}
