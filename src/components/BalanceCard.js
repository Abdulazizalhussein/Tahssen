import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { theme } from '../theme'
import { useAccount } from '../context/AccountContext'

export default function BalanceCard() {
  const { balance, monthlySpent, monthlyBudget, formatMoney, t, isRTL } = useAccount()
  const pct = monthlyBudget > 0 ? Math.min(100, (monthlySpent / monthlyBudget) * 100) : 0
  const over = monthlySpent > monthlyBudget
  const align = isRTL ? 'right' : 'left'

  return (
    <View style={styles.card}>
      <Text style={[styles.label, { textAlign: 'center' }]}>{t('balance')}</Text>
      <View style={styles.balanceRow}>
        <Text style={styles.balance}>{formatMoney(balance)}</Text>
        <Text style={styles.currency}>{t('currency')}</Text>
      </View>

      <View style={styles.accountRow}>
        <View style={styles.dot} />
        <Text style={styles.accountName}>{t('accountName')}</Text>
      </View>

      <View style={styles.divider} />

      <View style={[styles.spentRow, isRTL && styles.rtlRow]}>
        <Text style={styles.spentLabel}>{t('monthlySpent')}</Text>
        <Text style={styles.spentValue}>
          {formatMoney(monthlySpent)} / {formatMoney(monthlyBudget)}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: over ? theme.danger : theme.gold },
          ]}
        />
      </View>
      <Text style={[styles.pctText, { textAlign: align }]}>
        {Math.round(pct)}% {t('ofBudget')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.bgCardLight,
    borderRadius: theme.radiusXl,
    padding: 24,
    borderWidth: 0.5,
    borderColor: theme.borderLight,
  },
  rtlRow: { flexDirection: 'row-reverse' },
  label: { color: theme.textMuted, fontSize: 13, marginBottom: 10 },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  balance: { color: theme.text, fontSize: 42, fontWeight: '800', letterSpacing: 0.5 },
  currency: { color: theme.gold, fontSize: 18, fontWeight: '700', marginBottom: 7 },
  accountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.teal },
  accountName: { color: theme.textMuted, fontSize: 13, fontWeight: '500' },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 18 },
  spentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  spentLabel: { color: theme.textMuted, fontSize: 13 },
  spentValue: { color: theme.text, fontSize: 13, fontWeight: '600' },
  track: { height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  pctText: { color: theme.textMuted, fontSize: 12, marginTop: 6 },
})
