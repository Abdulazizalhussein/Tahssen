import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { theme, riskColorByScore } from '../theme'
import { useAccount } from '../context/AccountContext'
import RiskMeter from '../components/RiskMeter'
import { ErrorBox, SectionTitle } from '../components/ui'
import { generateInsights, computeStats } from '../agents/chatAgent'

const CATEGORIES = [
  { key: 'rent', labelKey: 'catRent' },
  { key: 'utilities', labelKey: 'catUtilities' },
  { key: 'subscription', labelKey: 'catSubscription' },
  { key: 'transport', labelKey: 'catTransport' },
  { key: 'other', labelKey: 'catOther' },
]

const QUICK_CHIPS = [
  { name: 'إيجار', nameEn: 'Rent', category: 'rent' },
  { name: 'كهرباء', nameEn: 'Electricity', category: 'utilities' },
  { name: 'إنترنت', nameEn: 'Internet', category: 'subscription' },
  { name: '', nameEn: '', category: 'other' },
]

export default function AnalyticsScreen() {
  const account = useAccount()
  const {
    transactions,
    formatMoney,
    monthlyIncome,
    fixedExpenses,
    totalFixedExpenses,
    monthlySpent,
    saveMonthlyIncome,
    addExpense,
    removeExpense,
    t,
    isRTL,
    lang,
  } = account
  const insets = useSafeAreaInsets()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const [incomeInput, setIncomeInput] = useState(monthlyIncome ? String(monthlyIncome) : '')
  const [expenseModal, setExpenseModal] = useState(false)
  const [editSheet, setEditSheet] = useState(false)
  const [expName, setExpName] = useState('')
  const [expNameEn, setExpNameEn] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState('other')

  const stats = computeStats(transactions)
  const hasIncome = monthlyIncome > 0

  const load = useCallback(async () => {
    if (monthlyIncome <= 0) return
    setBusy(true)
    setError(null)
    try {
      const res = await generateInsights(null, account)
      setData(res)
    } catch (e) {
      setError(e?.message || t('error'))
    } finally {
      setBusy(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length, lang, monthlyIncome])

  useEffect(() => {
    load()
  }, [load])

  const openExpense = (preset) => {
    setExpName(preset?.name || '')
    setExpNameEn(preset?.nameEn || '')
    setExpCategory(preset?.category || 'other')
    setExpAmount('')
    setExpenseModal(true)
  }

  const saveExpense = async () => {
    if (!expName.trim() || !(Number(expAmount) > 0)) return
    await addExpense({
      name: expName.trim(),
      nameEn: expNameEn.trim(),
      amount: Number(expAmount),
      category: expCategory,
    })
    setExpenseModal(false)
  }

  const saveOnboarding = async () => {
    await saveMonthlyIncome(Number(incomeInput) || 0)
  }

  const catLabel = (key) => {
    const c = CATEGORIES.find((x) => x.key === key)
    return c ? t(c.labelKey) : t('catOther')
  }

  const sortedByRisk = [...transactions].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8)

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headRow, isRTL && styles.rtl]}>
          <Text style={styles.h1}>{t('tabAnalytics')}</Text>
          {hasIncome && (
            <TouchableOpacity style={styles.refreshBtn} onPress={load} disabled={busy}>
              <Feather name="refresh-cw" size={16} color={theme.gold} />
              <Text style={styles.refreshText}>{t('refresh')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {!hasIncome ? (
          <OnboardingCard
            incomeInput={incomeInput}
            setIncomeInput={setIncomeInput}
            fixedExpenses={fixedExpenses}
            catLabel={catLabel}
            onQuickAdd={openExpense}
            onRemove={removeExpense}
            onSave={saveOnboarding}
            formatMoney={formatMoney}
            t={t}
            isRTL={isRTL}
          />
        ) : (
          <>
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

            <View style={[styles.breakdownHead, isRTL && styles.rtl]}>
              <SectionTitle icon="bar-chart-2">{t('budgetBreakdown')}</SectionTitle>
              <TouchableOpacity
                style={[styles.editBtn, isRTL && styles.rtl]}
                onPress={() => {
                  setIncomeInput(String(monthlyIncome))
                  setEditSheet(true)
                }}
              >
                <Feather name="edit-2" size={14} color={theme.teal} />
                <Text style={styles.editText}>{t('edit')}</Text>
              </TouchableOpacity>
            </View>
            <BudgetBreakdown
              income={monthlyIncome}
              fixed={totalFixedExpenses}
              variable={monthlySpent}
              formatMoney={formatMoney}
              t={t}
              isRTL={isRTL}
            />

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
          </>
        )}
      </ScrollView>

      {/* Edit financials bottom sheet */}
      <Modal visible={editSheet} transparent animationType="slide" onRequestClose={() => setEditSheet(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={[styles.sheetHead, isRTL && styles.rtl]}>
              <Text style={styles.sheetTitle}>{t('editFinancials')}</Text>
              <TouchableOpacity onPress={() => setEditSheet(false)}>
                <Feather name="x" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('monthlyIncome')}</Text>
              <View style={[styles.inputWrap, isRTL && styles.rtl]}>
                <Feather name="trending-up" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={`0 ${t('currency')}`}
                  placeholderTextColor={theme.textHint}
                  value={incomeInput}
                  onChangeText={setIncomeInput}
                  keyboardType="numeric"
                />
              </View>

              <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left', marginTop: 18 }]}>
                {t('fixedExpenses')}
              </Text>
              {fixedExpenses.length === 0 ? (
                <Text style={styles.emptyExp}>{t('noFixedExpenses')}</Text>
              ) : (
                fixedExpenses.map((e, i) => (
                  <View key={e.id} style={[styles.expRow, isRTL && styles.rtl, i > 0 && styles.expSep]}>
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={styles.expName}>{e.name}</Text>
                      <Text style={styles.expCat}>{catLabel(e.category)}</Text>
                    </View>
                    <Text style={styles.expAmount}>
                      {formatMoney(e.amount)} {t('currency')}
                    </Text>
                    <TouchableOpacity onPress={() => removeExpense(e.id)} style={styles.trashBtn}>
                      <Feather name="trash-2" size={18} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <TouchableOpacity style={[styles.addBtn, isRTL && styles.rtl]} onPress={() => openExpense()}>
                <Feather name="plus" size={18} color={theme.teal} />
                <Text style={styles.addBtnText}>{t('addExpense')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  await saveMonthlyIncome(Number(incomeInput) || 0)
                  setEditSheet(false)
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{t('done')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add expense bottom sheet */}
      <Modal visible={expenseModal} transparent animationType="slide" onRequestClose={() => setExpenseModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={[styles.sheetHead, isRTL && styles.rtl]}>
              <Text style={styles.sheetTitle}>{t('newExpense')}</Text>
              <TouchableOpacity onPress={() => setExpenseModal(false)}>
                <Feather name="x" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('expenseName')}</Text>
            <View style={[styles.inputWrap, isRTL && styles.rtl]}>
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t('expenseName')}
                placeholderTextColor={theme.textHint}
                value={expName}
                onChangeText={setExpName}
              />
            </View>

            <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left', marginTop: 14 }]}>
              {`${t('expenseAmount')} (${t('currency')})`}
            </Text>
            <View style={[styles.inputWrap, isRTL && styles.rtl]}>
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={`0 ${t('currency')}`}
                placeholderTextColor={theme.textHint}
                value={expAmount}
                onChangeText={setExpAmount}
                keyboardType="numeric"
              />
            </View>

            <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left', marginTop: 14 }]}>{t('category')}</Text>
            <View style={styles.catWrap}>
              {CATEGORIES.map((c) => {
                const active = expCategory === c.key
                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => setExpCategory(c.key)}
                  >
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{t(c.labelKey)}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, (!expName.trim() || !(Number(expAmount) > 0)) && { opacity: 0.4 }]}
              onPress={saveExpense}
              disabled={!expName.trim() || !(Number(expAmount) > 0)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

function OnboardingCard({
  incomeInput,
  setIncomeInput,
  fixedExpenses,
  catLabel,
  onQuickAdd,
  onRemove,
  onSave,
  formatMoney,
  t,
  isRTL,
}) {
  return (
    <View style={styles.onboardCard}>
      <View style={[styles.onboardHead, isRTL && styles.rtl]}>
        <View style={styles.bulb}>
          <Feather name="zap" size={18} color={theme.gold} />
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={styles.onboardTitle}>{t('enableAnalyticsTitle')}</Text>
          <Text style={styles.onboardSub}>{t('enableAnalyticsSubtitle')}</Text>
        </View>
      </View>

      <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('monthlyIncome')}</Text>
      <View style={[styles.inputWrap, isRTL && styles.rtl]}>
        <Feather name="trending-up" size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
          placeholder={`0 ${t('currency')}`}
          placeholderTextColor={theme.textHint}
          value={incomeInput}
          onChangeText={setIncomeInput}
          keyboardType="numeric"
        />
      </View>

      <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left', marginTop: 18 }]}>
        {t('fixedExpenses')}
      </Text>
      {fixedExpenses.length > 0 &&
        fixedExpenses.map((e, i) => (
          <View key={e.id} style={[styles.expRow, isRTL && styles.rtl, i > 0 && styles.expSep]}>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={styles.expName}>{e.name}</Text>
              <Text style={styles.expCat}>{catLabel(e.category)}</Text>
            </View>
            <Text style={styles.expAmount}>
              {formatMoney(e.amount)} {t('currency')}
            </Text>
            <TouchableOpacity onPress={() => onRemove(e.id)} style={styles.trashBtn}>
              <Feather name="trash-2" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        ))}
      <View style={styles.chipsWrap}>
        {QUICK_CHIPS.map((c, i) => (
          <TouchableOpacity key={i} style={[styles.quickChip, isRTL && styles.rtl]} onPress={() => onQuickAdd(c)}>
            <Feather name="plus" size={14} color={theme.teal} />
            <Text style={styles.quickChipText}>
              {c.category === 'other' ? t('catOther') : isRTL ? c.name : c.nameEn}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, !(Number(incomeInput) > 0) && { opacity: 0.4 }]}
        onPress={onSave}
        disabled={!(Number(incomeInput) > 0)}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>{t('saveAndEnable')}</Text>
      </TouchableOpacity>
    </View>
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
    borderWidth: 0.5,
    borderColor: theme.border,
  },
  refreshText: { color: theme.gold, fontSize: 13, fontWeight: '600' },
  onboardCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusXl,
    padding: 20,
    marginTop: 18,
    borderWidth: 0.5,
    borderColor: theme.borderLight,
  },
  onboardHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  bulb: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${theme.gold}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardTitle: { color: theme.text, fontSize: 16, fontWeight: '800' },
  onboardSub: { color: theme.textMuted, fontSize: 13, marginTop: 4, lineHeight: 19 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  quickChipText: { color: theme.text, fontSize: 13, fontWeight: '600' },
  breakdownHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24 },
  editText: { color: theme.teal, fontSize: 13, fontWeight: '700' },
  healthCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    padding: 22,
    alignItems: 'center',
    marginTop: 18,
    borderWidth: 0.5,
    borderColor: theme.border,
  },
  cardLabel: { color: theme.textMuted, fontSize: 13, marginBottom: 14 },
  budgetCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    padding: 18,
    borderWidth: 0.5,
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
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    padding: 16,
    borderWidth: 0.5,
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
    borderWidth: 0.5,
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
    borderWidth: 0.5,
    borderColor: `${theme.teal}40`,
  },
  predictText: { color: theme.text, fontSize: 14, lineHeight: 21 },
  predictValue: { color: theme.teal, fontSize: 18, fontWeight: '800', marginTop: 6 },
  riskCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    padding: 16,
    borderWidth: 0.5,
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
  // shared form / sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.bgCard,
    borderTopLeftRadius: theme.radiusXl,
    borderTopRightRadius: theme.radiusXl,
    padding: 22,
    paddingBottom: 36,
    maxHeight: '85%',
    borderTopWidth: 0.5,
    borderColor: theme.borderLight,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sheetTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
  fieldLabel: { color: theme.textMuted, fontSize: 13, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  input: { flex: 1, color: theme.text, fontSize: 16, paddingVertical: 13 },
  emptyExp: { color: theme.textHint, fontSize: 13, paddingVertical: 6 },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  expSep: { borderTopWidth: 1, borderTopColor: theme.border },
  expName: { color: theme.text, fontSize: 15, fontWeight: '600' },
  expCat: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  expAmount: { color: theme.gold, fontSize: 15, fontWeight: '700' },
  trashBtn: { padding: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: `${theme.teal}18`,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${theme.teal}40`,
    marginTop: 14,
  },
  addBtnText: { color: theme.teal, fontSize: 15, fontWeight: '700' },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  catChipActive: { backgroundColor: theme.teal, borderColor: theme.teal },
  catChipText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  catChipTextActive: { color: theme.text },
  primaryBtn: {
    backgroundColor: theme.teal,
    height: 52,
    borderRadius: theme.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryBtnText: { color: theme.text, fontSize: 16, fontWeight: '600' },
})
