import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Clock, ArrowUpRight, MessageCircle, BarChart2, Users, Inbox, Activity, Sparkles, CalendarDays, Network, Compass } from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import BalanceCard from '../components/BalanceCard'
import TransactionItem from '../components/TransactionItem'
import { SectionTitle } from '../components/ui'
import { accountStatusLine } from '../agents/chatAgent'
import { TypingDots } from '../components/ui'
import './HomePage.css'

function QuickAction({ icon: Icon, label, onClick, primary }) {
  return (
    <button
      className={`home-action${primary ? ' home-action--primary' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span className={`home-action__icon${primary ? ' home-action__icon--primary' : ''}`}>
        <Icon size={22} color={primary ? '#fff' : 'var(--teal)'} />
      </span>
      <span className="home-action__label">{label}</span>
    </button>
  )
}

export default function HomePage() {
  const account = useAccount()
  const { transactions, userName, t, isRTL, lang, replayOnboarding } = account
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  // Arabic leads with the Hijri (Umm al-Qura) date; the Gregorian date sits
  // underneath. English leads with Gregorian and shows Hijri as the secondary.
  const now = new Date()
  const primaryLocale = lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-GB'
  const altLocale = lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US-u-ca-islamic-umalqura'
  const today = now.toLocaleDateString(primaryLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const altDate = now.toLocaleDateString(altLocale, { day: 'numeric', month: 'long', year: 'numeric' })

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const line = await accountStatusLine(account)
      setStatus(line)
    } catch {
      setStatus('')
    } finally {
      setLoadingStatus(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length, lang])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const recent = transactions.slice(0, 5)

  return (
    <div className="page-scroll home-page">
      {/* Header */}
      <div className="home-header">
        <div className="home-header__text">
          <h1 className="home-greeting">
            {userName ? `${t('greeting')}${lang === 'ar' ? '،' : ','} ${userName}` : t('appName')}
          </h1>
          <p className="home-date">{today}</p>
          <p className="home-date home-date--alt">
            <CalendarDays size={12} aria-hidden="true" /> {altDate}
          </p>
        </div>
        <button className="home-tour-btn" onClick={replayOnboarding} type="button" aria-label={t('replayTour')}>
          <Compass size={15} aria-hidden="true" />
          <span>{t('replayTour')}</span>
        </button>
      </div>

      {/* Account health status banner */}
      <div className="home-status-banner">
        <Activity size={16} color="var(--teal)" style={{ flexShrink: 0 }} />
        {loadingStatus ? (
          <TypingDots />
        ) : (
          <span className="home-status-text">
            {status || t('accountHealth')}
          </span>
        )}
      </div>

      {/* Balance card */}
      <div className="home-balance-wrap">
        <BalanceCard />
      </div>

      {/* Quick actions */}
      <SectionTitle icon={Zap}>{t('quickActions')}</SectionTitle>
      <div className="home-actions">
        <QuickAction
          icon={ArrowUpRight}
          label={t('transfer')}
          primary
          onClick={() => navigate('/app/transfer')}
        />
        <QuickAction
          icon={Network}
          label={t('community')}
          onClick={() => navigate('/app/community')}
        />
        <QuickAction
          icon={Sparkles}
          label={t('smartTips')}
          onClick={() => navigate('/app/recommendations')}
        />
        <QuickAction
          icon={Users}
          label={t('beneficiaries')}
          onClick={() => navigate('/app/beneficiaries')}
        />
        <QuickAction
          icon={MessageCircle}
          label={t('chatWithTahseen')}
          onClick={() => navigate('/app/chat')}
        />
        <QuickAction
          icon={BarChart2}
          label={t('analytics')}
          onClick={() => navigate('/app/analytics')}
        />
      </div>

      {/* Recent transactions */}
      <SectionTitle icon={Clock}>{t('recentTransactions')}</SectionTitle>
      {recent.length === 0 ? (
        <div className="empty-state">
          <Inbox size={28} />
          <span>{t('noTransactions')}</span>
        </div>
      ) : (
        <div className="home-tx-card">
          {recent.map((tx, i) => (
            <div key={tx.id}>
              <TransactionItem tx={tx} />
              {i < recent.length - 1 && <div className="home-tx-sep" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
