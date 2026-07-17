import React from 'react'
import { Shield, ArrowUpRight } from 'lucide-react'
import { riskColorByScore } from '../theme'
import { useAccount } from '../store/AccountContext'
import RiyalSymbol from './RiyalSymbol'

export default function TransactionItem({ tx }) {
  const { formatMoney, t, lang } = useAccount()
  const blocked = tx.blocked
  const iconColor = blocked ? 'var(--danger)' : 'var(--gold)'
  const riskC = riskColorByScore(tx.riskScore)

  const dateStr = new Date(tx.timestamp).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="tx-item">
      <div
        className="tx-item__icon"
        aria-hidden="true"
        style={{ backgroundColor: blocked ? 'rgba(217,48,37,0.12)' : 'rgba(201,162,39,0.12)' }}
      >
        {blocked
          ? <Shield size={18} color={iconColor} />
          : <ArrowUpRight size={18} color={iconColor} />}
      </div>

      <div className="tx-item__middle">
        <span className="tx-item__name">{tx.beneficiary || '—'}</span>
        <span className="tx-item__sub">
          {dateStr} · {blocked ? t('blocked') : t('sent')}
        </span>
      </div>

      <div className="tx-item__right">
        <span
          className="tx-item__amount"
          style={blocked ? { color: 'var(--text-hint)', textDecoration: 'line-through' } : undefined}
        >
          {blocked ? '' : '-'}{formatMoney(tx.amount)} <RiyalSymbol size="0.75em" />
        </span>
        <span
          className="tx-item__risk-pill"
          aria-label={`${t('riskScore')} ${tx.riskScore}`}
          style={{ backgroundColor: `${riskC}1a` }}
        >
          <span
            className="tx-item__risk-dot"
            style={{ backgroundColor: riskC }}
          />
          <span className="tx-item__risk-score" style={{ color: riskC }}>
            {tx.riskScore}
          </span>
        </span>
      </div>
    </div>
  )
}
