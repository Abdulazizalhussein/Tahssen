import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { theme, riskColorByScore } from '../theme'
import { useAccount } from '../context/AccountContext'
import RiskMeter from '../components/RiskMeter'
import { NoApiKey, ErrorBox, SectionTitle } from '../components/ui'
import { generateInsights, computeStats } from '../agents/chatAgent'

export default function AnalyticsScreen({ navigation }) {
  const account = useAccount()
  const {
    apiKey,
    transactions,
    formatMoney,
    monthlyIncome,
    totalFixedExpenses,
    monthlySpent,
    t,
    isRTL,
    lang,
  } = account
  const insets = useSafeAreaInsets()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const stats = computeStats(transactions)

  const load = useCallback(async () => {
    if (!apiKey) return
    setBusy(true)
    setError(null)
    try {
      const res = await generateInsights(apiKey, account)
      setData(res)
    } catch (e) {
      setError(e?.code === 'MISSING_API_KEY' ? t('noApiKeyMsg') : e?.message || t('error'))
    } finally {
      setBusy(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, transactions.length, lang])

  useEffect(() => {
    load()
  }, [load])

  if (!apiKey) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 20, padding: 20 }]}>
        <Text style={[styles.h1, { textAlign: isRTL ? 'right' : 'left' }]}>{t('tabAnalytics')}</Text>
        <View style={{ marginTop: 20 }}>
          <NoApiKey onGoSettings={() => navigation.navigate('Settings')} />
        </View>
      </View>
    )
  }

  const sortedByRisk = [...transactions].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8)

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headRow, isRTL && styles.rtl]}>
        <Text style={styles.h1}>{t('tabAnalytics')}</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={load} disabled={busy}>
          <Feather name="refresh-cw" size={16} color={theme.gold} />
          <Text style={styles.refreshText}>{t('refresh')}</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={{ marginTop: 16 }}>
          <ErrorBox message={error} onRetry={load} />
        </View>
      )}

      <View style={styles.healthCard}>
        <Text style={styles.cardLabel}>{t('healthScore')}</Text>
        {busy && !data ? (
          <View style={{ paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={theme.gold} />
          </View>
        ) : (
          <RiskMeter score={data ? 100 - data.healthScore : 0} label={`${data?.healthScore ?? 0}/100`} />
        )}
      </View>

      <SectionTitle icon="bar-chart-2">{t('budgetBreakdown')}</SectionTitle>
      {monthlyIncome > 0 ? (
        <BudgetBreakdown
          income={monthlyIncome}
          fixed={totalFixedExpenses}
          variable={monthlySpent}
          formatMoney={formatMoney}
          t={t}
          isRTL={isRTL}
        />
      ) : (
        <View style={[styles.incomeBanner, isRTL && styles.rtl]}>
          <Feather name="alert-circle" size={18} color={theme.warning} />
          <Text style={[styles.incomeBannerText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('setupIncomeBanner')}
          </Text>
        </View>
      )}

      <SectionTitle icon="pie-chart">{t('spendingBreakdown')}</SectionTitle>
      <View style={styles.statsRow}>
        <StatCard label={t('totalSent')} value={`${formatMoney(stats.totalSent)}`} icon="arrow-up-right" color={theme.gold} />
        <StatCard label={t('totalBlocked')} value={`${formatMoney(stats.totalBlocked)}`} icon="shield" color={theme.danger} />
      </View>
      <View style={[styles.statsRow, { marginTop: 12 }]}>
        <StatCard label={t('avgTransfer')} value={`${formatMoney(stats.avgTransfer)}`} icon="trending-up" color={theme.teal} />
        <StatCard label={t('recentTransactions')} value={`${stats.sentCount + stats.blockedCount}`} icon="list" color={theme.text} />
      </View>

      {data?.insights?.length > 0 && (
        <>
          <SectionTitle icon="zap">{t('aiInsights')}</SectionTitle>
          <View style={styles.insightCard}>
            {data.insights.map((ins, i) => (
              <View key={i} style={[styles.insightLine, isRTL && styles.rtl, i > 0 && styles.insightSep]}>
                <View style={styles.insightDot}>
                  <Feather name="arrow-up-right" size={14} color={theme.gold} />
                </View>
                <Text style={[styles.insightText, { textAlign: isRTL ? 'right' : 'left' }]}>{ins}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {!!data?.monthEndPrediction && (
        <>
          <SectionTitle icon="calendar">{t('monthEndPrediction')}</SectionTitle>
          <View style={styles.predictCard}>
            <Feather name="trending-down" size={20} color={theme.teal} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.predictText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {data.monthEndPrediction}
              </Text>
              {typeof data.predictedMonthEndBalance === 'number' && (
                <Text style={styles.predictValue}>
                  {formatMoney(data.predictedMonthEndBalance)} {t('currency')}
                </Text>
              )}
            </View>
          </View>
        </>
      )}

      <SectionTitle icon="bar-chart-2">{t('riskHistory')}</SectionTitle>
      {sortedByRisk.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={26} color={theme.textHint} />
          <Text style={styles.emptyText}>{t('noTransactions')}</Text>
        </View>
      ) : (
        <View style={styles.riskCard}>
          {sortedByRisk.map((tx) => {
            const c = riskColorByScore(tx.riskScore)
            return (
              <View key={tx.id} style={[styles.riskRow, isRTL && styles.rtl]}>
                <Text style={[styles.riskName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                  {tx.beneficiary || '—'}
                </Text>
                <View style={styles.riskBarTrack}>
                  <View style={[styles.riskBarFill, { width: `${tx.riskScore}%`, backgroundColor: c }]} />
                </View>
                <Text style={[styles.riskScoreText, { color: c }]}>{tx.riskScore}</Text>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

function BudgetBreakdown({ income, fixed, variable, formatMoney, t, isRTL }) {
  const remaining = income - fixed - variable
  const max = Math.max(income, fixed + variable, 1)
  const rows = [
    { label: t('income'), value: income, color: theme.teal },
    { label: t('fixed'), value: fixed, color: theme.danger },
    { label: t('variableSpending'), value: variable, color: theme.warning },
    {
      label: t('remaining'),
      value: remaining,
      color: remaining >= 0 ? theme.success : theme.danger,
    },
  ]
  return (
    <View style={styles.budgetCard}>
      {rows.map((r, i) => (
        <View key={i} style={[styles.budgetRow, i > 0 && { marginTop: 14 }]}>
          <View style={[styles.budgetLabelRow, isRTL && styles.rtl]}>
            <Text style={styles.budgetLabel}>{r.label}</Text>
            <Text style={[styles.budgetValue, { color: r.color }]}>
              {formatMoney(r.value)} {t('currency')}
            </Text>
          </View>
          <View style={styles.budgetTrack}>
            <View
              style={{
                height: 10,
                borderRadius: 5,
                backgroundColor: r.color,
                width: `${Math.min(100, (Math.abs(r.value) / max) * 100)}%`,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  rtl: { flexDirection: 'row-reverse' },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { color: theme.text, fontSize: 26, fontWeight: '800' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.bgCardLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
  },
  refreshText: { color: theme.gold, fontSize: 13, fontWeight: '600' },
  healthCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    padding: 22,
    alignItems: 'center',
    marginTop: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardLabel: { color: theme.textMuted, fontSize: 13, marginBottom: 14 },
  budgetCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  budgetRow: {},
  budgetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetLabel: { color: theme.textMuted, fontSize: 13 },
  budgetValue: { fontSize: 14, fontWeight: '700' },
  budgetTrack: { height: 10, backgroundColor: theme.border, borderRadius: 5, overflow: 'hidden' },
  incomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${theme.warning}14`,
    borderWidth: 1,
    borderColor: `${theme.warning}55`,
    borderRadius: theme.radius,
    padding: 14,
  },
  incomeBannerText: { color: theme.text, fontSize: 13, flex: 1, lineHeight: 19 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { color: theme.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: theme.textMuted, fontSize: 12, marginTop: 3 },
  insightCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  insightLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  insightSep: { borderTopWidth: 1, borderTopColor: theme.border },
  insightDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${theme.gold}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: { color: theme.text, fontSize: 14, flex: 1, lineHeight: 21 },
  predictCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: `${theme.teal}14`,
    borderRadius: theme.radiusLg,
    padding: 18,
    borderWidth: 1,
    borderColor: `${theme.teal}40`,
  },
  predictText: { color: theme.text, fontSize: 14, lineHeight: 21 },
  predictValue: { color: theme.teal, fontSize: 18, fontWeight: '800', marginTop: 6 },
  riskCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 14,
  },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  riskName: { color: theme.text, fontSize: 13, width: 90 },
  riskBarTrack: { flex: 1, height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden' },
  riskBarFill: { height: 8, borderRadius: 4 },
  riskScoreText: { fontSize: 13, fontWeight: '700', width: 28, textAlign: 'right' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  emptyText: { color: theme.textHint, fontSize: 14 },
})
