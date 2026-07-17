import React from 'react'
import { useAccount } from '../store/AccountContext'
import RiyalSymbol from './RiyalSymbol'

export default function BalanceCard() {
  const { balance, monthlySpent, monthlyBudget, formatMoney, t, isRTL } = useAccount()
  const pct = monthlyBudget > 0 ? Math.min(100, (monthlySpent / monthlyBudget) * 100) : 0
  const over = monthlySpent > monthlyBudget

  return (
    <div className="balance-card">
      <p className="balance-card__label">{t('balance')}</p>

      <div className="balance-card__amount-row">
        <span className="balance-card__amount">{formatMoney(balance)}</span>
        <span className="balance-card__currency"><RiyalSymbol size="0.8em" /></span>
      </div>

      <div className="balance-card__account-row">
        <span className="balance-card__dot" />
        <span className="balance-card__account-name">{t('accountName')}</span>
      </div>

      <div className="balance-card__divider" />

      <div className="balance-card__spent-row">
        <span className="balance-card__spent-label">{t('monthlySpent')}</span>
        <span className="balance-card__spent-value">
          {formatMoney(monthlySpent)} / {formatMoney(monthlyBudget)}
        </span>
      </div>

      <div className="balance-card__track">
        <div
          className="balance-card__fill"
          style={{
            width: `${pct}%`,
            backgroundColor: over ? 'var(--danger)' : 'var(--gold)',
          }}
        />
      </div>

      <p
        className="balance-card__pct"
        style={{ textAlign: isRTL ? 'start' : 'start' }}
      >
        {Math.round(pct)}% {t('ofBudget')}
      </p>
    </div>
  )
}
