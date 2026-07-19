import React, { useState, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, Users, TriangleAlert, Plus, Network, ChevronDown, Info } from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import { SectionTitle } from '../components/ui'
import FraudGraph from '../components/FraudGraph'
import ReportFraudModal from '../components/ReportFraudModal'
import { classifyBeneficiaries, networkReasons } from '../store/community'
import './CommunityPage.css'

export default function CommunityPage() {
  const { t, lang, beneficiaries } = useAccount()
  const location = useLocation()
  const [tick, setTick] = useState(0) // bump to re-read the registry after a report
  const [modal, setModal] = useState(false)
  const [expanded, setExpanded] = useState(null)

  // The protection view is built FROM the beneficiaries the user added.
  const { risky, safe } = useMemo(() => classifyBeneficiaries(beneficiaries), [beneficiaries, tick])

  const prefill = location.state?.reportPrefill
  const onReported = useCallback(() => setTick((x) => x + 1), [])

  return (
    <div className="page-scroll community-page" key={tick}>
      <div className="community-head">
        <span className="community-head-icon"><ShieldCheck size={22} color="var(--gold)" /></span>
        <div>
          <h1 className="community-title">{t('communityTitle')}</h1>
          <p className="community-intro">{t('communityIntroMine')}</p>
        </div>
      </div>

      {/* Stats — a snapshot of YOUR beneficiaries' protection status */}
      <div className="community-stats">
        <Stat icon={Users} color="var(--gold)" value={beneficiaries.length} label={t('statBeneficiaries')} />
        <Stat icon={TriangleAlert} color="var(--danger)" value={risky.length} label={t('statRisky')} />
        <Stat icon={ShieldCheck} color="var(--success-bright)" value={safe.length} label={t('statSafe')} />
      </div>

      <button className="btn btn-danger btn-full community-report-btn" onClick={() => setModal(true)}>
        <Plus size={16} /> {t('reportFraudBtn')}
      </button>

      {beneficiaries.length === 0 ? (
        <div className="empty-state"><ShieldCheck size={26} /><span>{t('benNoBeneficiaries')}</span></div>
      ) : (
        <>
          {risky.length > 0 && (
            <>
              <SectionTitle icon={ShieldAlert}>{t('benGroupRisky')}</SectionTitle>
              <div className="community-list">
                {risky.map((r) => (
                  <RiskyCard
                    key={r.beneficiary.id}
                    entry={r}
                    t={t}
                    lang={lang}
                    open={expanded === r.beneficiary.id}
                    onToggle={() => setExpanded(expanded === r.beneficiary.id ? null : r.beneficiary.id)}
                  />
                ))}
              </div>
            </>
          )}

          {safe.length > 0 && (
            <>
              <SectionTitle icon={ShieldCheck}>{t('benGroupSafe')}</SectionTitle>
              <div className="community-list">
                {safe.map((b) => <SafeCard key={b.id} b={b} t={t} />)}
              </div>
            </>
          )}
        </>
      )}

      <p className="community-demo-note"><Info size={13} /> {t('communityDemoNote')}</p>

      <ReportFraudModal visible={modal} onClose={() => setModal(false)} onReported={onReported} prefill={prefill} />
    </div>
  )
}

function Stat({ icon: Icon, color, value, label }) {
  return (
    <div className="community-stat">
      <Icon size={18} color={color} aria-hidden="true" />
      <span className="community-stat-value" style={{ color }}>{value}</span>
      <span className="community-stat-label">{label}</span>
    </div>
  )
}

function RiskyCard({ entry, t, lang, open, onToggle }) {
  const { beneficiary: b, lookup } = entry
  const net = lookup.network
  const kindLabel = lookup.kind === 'linked' ? t('benReportedLinked') : lookup.found ? t('benReportedDirect') : t('benBlockedLabel')
  const lastReason = net ? networkReasons(net, lang, 1)[0] : ''
  return (
    <div className={`payee-card risky${open ? ' open' : ''}`}>
      <button className="payee-card-head" onClick={onToggle} aria-expanded={open} disabled={!net}>
        <span className="payee-avatar"><TriangleAlert size={18} color="var(--danger)" /></span>
        <div className="payee-info">
          <div className="payee-name-row">
            <span className="payee-name">{b.name}</span>
            {net && <span className="payee-count">{net.reportCount} {t('reportsUnit')}</span>}
          </div>
          <div className="payee-meta">
            <span className="payee-kind danger-text">{kindLabel}</span>
            {net && <span className="payee-when">· {t(`cat_${net.category}`)}</span>}
          </div>
          {lastReason && <p className="payee-reason">“{lastReason}”</p>}
        </div>
        {net && <ChevronDown size={18} className="payee-chevron" color="var(--text-muted)" />}
      </button>

      {open && net && (
        <div className="payee-graph">
          <div className="payee-graph-label"><Network size={14} color="var(--gold)" /> {t('viewNetwork')}</div>
          <p className="payee-graph-hint"><Info size={12} /> {t('graphTapHint')}</p>
          <FraudGraph network={net} />
        </div>
      )}
    </div>
  )
}

function SafeCard({ b, t }) {
  return (
    <div className="safe-card">
      <span className="safe-avatar"><ShieldCheck size={18} color="var(--success-bright)" /></span>
      <div className="payee-info">
        <div className="payee-name-row"><span className="payee-name">{b.name}</span></div>
        <div className="payee-meta">
          <span className="safe-text">{t('benSafeState')}</span>
          {b.bank && <span className="payee-when">· {b.bank}</span>}
        </div>
      </div>
    </div>
  )
}
