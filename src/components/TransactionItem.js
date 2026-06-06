import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { theme, riskColorByScore } from '../theme'
import { useAccount } from '../context/AccountContext'

export default function TransactionItem({ tx }) {
  const { formatMoney, t, isRTL } = useAccount()
  const blocked = tx.blocked
  const iconName = blocked ? 'shield' : 'arrow-up-right'
  const iconColor = blocked ? theme.danger : theme.gold
  const riskC = riskColorByScore(tx.riskScore)
  const date = new Date(tx.timestamp)
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`

  return (
    <View style={[styles.row, isRTL && styles.rtlRow]}>
      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}22` }]}>
        <Feather name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.middle}>
        <Text style={[styles.name, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
          {tx.beneficiary || '—'}
        </Text>
        <Text style={[styles.sub, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
          {dateStr} · {blocked ? t('blocked') : t('sent')}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, blocked && styles.amountBlocked]}>
          {blocked ? '' : '-'}
          {formatMoney(tx.amount)}
        </Text>
        <View style={[styles.riskPill, { backgroundColor: `${riskC}22` }]}>
          <View style={[styles.riskDot, { backgroundColor: riskC }]} />
          <Text style={[styles.riskText, { color: riskC }]}>{tx.riskScore}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  rtlRow: { flexDirection: 'row-reverse' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1 },
  name: { color: theme.text, fontSize: 15, fontWeight: '600' },
  sub: { color: theme.textMuted, fontSize: 12, marginTop: 3 },
  right: { alignItems: 'flex-end', gap: 6 },
  amount: { color: theme.text, fontSize: 15, fontWeight: '700' },
  amountBlocked: { color: theme.textMuted, textDecorationLine: 'line-through' },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskText: { fontSize: 11, fontWeight: '700' },
})
