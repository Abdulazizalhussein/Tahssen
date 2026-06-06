import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { theme } from '../theme'
import { useAccount } from '../context/AccountContext'
import BalanceCard from '../components/BalanceCard'
import TransactionItem from '../components/TransactionItem'
import { SectionTitle } from '../components/ui'
import { accountStatusLine } from '../agents/chatAgent'

function Action({ icon, label, onPress, primary }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.actionIcon, primary && styles.actionIconPrimary]}>
        <Feather name={icon} size={22} color={primary ? theme.text : theme.teal} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

export default function HomeScreen({ navigation }) {
  const account = useAccount()
  const { transactions, apiKey, userName, t, isRTL, lang } = account
  const insets = useSafeAreaInsets()
  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  const today = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const loadStatus = useCallback(async () => {
    if (!apiKey) {
      setStatus(null)
      return
    }
    setLoadingStatus(true)
    try {
      const line = await accountStatusLine(apiKey, account)
      setStatus(line)
    } catch (e) {
      setStatus('')
    } finally {
      setLoadingStatus(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, transactions.length, lang])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const recent = transactions.slice(0, 5)

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, isRTL && styles.rtl]}>
        <View style={isRTL && { alignItems: 'flex-end' }}>
          <Text style={styles.greeting}>
            {userName ? `${t('greeting')}، ${userName}` : t('appName')}
          </Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <TouchableOpacity style={styles.bell} activeOpacity={0.85}>
          <Feather name="bell" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusBanner}>
        <Feather name="activity" size={16} color={theme.teal} />
        {loadingStatus ? (
          <ActivityIndicator size="small" color={theme.teal} />
        ) : (
          <Text style={[styles.statusText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {status || t('accountHealth')}
          </Text>
        )}
      </View>

      <View style={{ marginTop: 16 }}>
        <BalanceCard />
      </View>

      <SectionTitle icon="zap">{t('quickActions')}</SectionTitle>
      <View style={[styles.actions, isRTL && styles.rtl]}>
        <Action icon="arrow-up-right" label={t('transfer')} primary onPress={() => navigation.navigate('Transfer')} />
        <Action icon="message-circle" label={t('chatWithTahseen')} onPress={() => navigation.navigate('Chat')} />
        <Action icon="bar-chart-2" label={t('analytics')} onPress={() => navigation.navigate('Analytics')} />
      </View>

      <SectionTitle icon="clock">{t('recentTransactions')}</SectionTitle>
      {recent.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={28} color={theme.textHint} />
          <Text style={styles.emptyText}>{t('noTransactions')}</Text>
        </View>
      ) : (
        <View style={styles.txCard}>
          {recent.map((tx, i) => (
            <View key={tx.id}>
              <TransactionItem tx={tx} />
              {i < recent.length - 1 && <View style={styles.sep} />}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  rtl: { flexDirection: 'row-reverse' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { color: theme.text, fontSize: 24, fontWeight: '800' },
  date: { color: theme.textMuted, fontSize: 13, marginTop: 4 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: theme.borderLight,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${theme.teal}14`,
    borderWidth: 0.5,
    borderColor: `${theme.teal}40`,
    borderRadius: theme.radius,
    padding: 14,
    marginTop: 18,
  },
  statusText: { color: theme.text, fontSize: 13, flex: 1, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1, alignItems: 'center', gap: 8 },
  actionIcon: {
    width: '100%',
    height: 72,
    borderRadius: theme.radius,
    backgroundColor: theme.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: theme.borderLight,
  },
  actionIconPrimary: { backgroundColor: theme.teal, borderColor: theme.teal },
  actionLabel: { color: theme.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  txCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    paddingHorizontal: 16,
    borderWidth: 0.5,
    borderColor: theme.border,
  },
  sep: { height: 1, backgroundColor: theme.border },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 36 },
  emptyText: { color: theme.textHint, fontSize: 14 },
})
