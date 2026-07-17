import React, { useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldCheck, Users, TriangleAlert, CalendarClock, Plus, Network, ChevronDown, Info } from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import { SectionTitle } from '../components/ui'
import FraudGraph from '../components/FraudGraph'
import ReportFraudModal from '../components/ReportFraudModal'
import { getNetworks, communityStats, networkReasons } from '../store/community'
import './CommunityPage.css'

export default function CommunityPage() {
  const { t, lang } = useAccount()
  const location = useLocation()
  const [tick, setTick] = useState(0) // bump to re-read the registry after a report
  const [modal, setModal] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const networks = getNetworks()
  const stats = communityStats()

  // Support deep-link prefill from the transfer "report" action.
  const prefill = location.state?.reportPrefill

  const onReported = useCallback((net) => {
    setTick((x) => x + 1)
    if (net?.id) setExpanded(net.id)
  }, [])

  return (
    <div className="page-scroll community-page" key={tick}>
      <div className="community-head">
        <span className="community-head-icon"><ShieldCheck size={22} color="var(--gold)" /></span>
        <div>
          <h1 className="community-title">{t('communityTitle')}</h1>
          <p className="community-intro">{t('communityIntro')}</p>
        </div>
      </div>

      {/* Stats — informational for the end user, no money figures */}
      <div className="community-stats">
        <Stat icon={TriangleAlert} color="var(--danger)" value={stats.reports} label={t('communityReportsStat')} />
        <Stat icon={CalendarClock} color="var(--teal-light)" value={stats.thisWeek} label={t('communityThisWeekStat')} />
        <Stat icon={Users} color="var(--gold)" value={stats.victims} label={t('communityVictimsStat')} />
      </div>

      <button className="btn btn-danger btn-full community-report-btn" onClick={() => setModal(true)}>
        <Plus size={16} /> {t('reportFraudBtn')}
      </button>

      {/* Reported payees */}
      <SectionTitle icon={TriangleAlert}>{t('reportedPayees')}</SectionTitle>
      {networks.length === 0 ? (
        <div className="empty-state"><ShieldCheck size={26} /><span>{t('communityEmpty')}</span></div>
      ) : (
        <div className="community-list">
          {networks.map((n) => (
            <PayeeCard
              key={n.id}
              net={n}
              t={t}
              lang={lang}
              open={expanded === n.id}
              onToggle={() => setExpanded(expanded === n.id ? null : n.id)}
            />
          ))}
        </div>
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

function PayeeCard({ net, t, lang, open, onToggle }) {
  const lastReason = networkReasons(net, lang, 1)[0] || ''
  const when = net.daysAgo === 0 ? t('lastReportedToday') : t('lastReportedDays').replace('{n}', String(net.daysAgo))
  return (
    <div className={`payee-card${open ? ' open' : ''}`}>
      <button className="payee-card-head" onClick={onToggle} aria-expanded={open}>
        <span className="payee-avatar"><TriangleAlert size={18} color="var(--danger)" /></span>
        <div className="payee-info">
          <div className="payee-name-row">
            <span className="payee-name">{net.payee}</span>
            <span className="payee-count">{net.reportCount} {t('reportsUnit')}</span>
          </div>
          <div className="payee-meta">
            <span className="payee-cat">{t(`cat_${net.category}`)}</span>
            <span className="payee-when">· {when}</span>
            <span className="payee-when">· {net.victims.length} {t('communityVictimsStat')}</span>
          </div>
          {lastReason && <p className="payee-reason">“{lastReason}”</p>}
        </div>
        <ChevronDown size={18} className="payee-chevron" color="var(--text-muted)" />
      </button>

      {open && (
        <div className="payee-graph">
          <div className="payee-graph-label"><Network size={14} color="var(--gold)" /> {t('viewNetwork')}</div>
          <p className="payee-graph-hint"><Info size={12} /> {t('graphTapHint')}</p>
          <FraudGraph network={net} />
        </div>
      )}
    </div>
  )
}
