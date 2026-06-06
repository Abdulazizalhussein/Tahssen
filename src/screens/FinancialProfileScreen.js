import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { theme } from '../theme'
import { useAccount } from '../context/AccountContext'
import { SectionTitle } from '../components/ui'

const CATEGORIES = [
  { key: 'rent', labelKey: 'catRent' },
  { key: 'utilities', labelKey: 'catUtilities' },
  { key: 'subscription', labelKey: 'catSubscription' },
  { key: 'transport', labelKey: 'catTransport' },
  { key: 'other', labelKey: 'catOther' },
]

const SUGGESTIONS = [
  { nameKey: 'sugRent', name: 'إيجار', nameEn: 'Rent', category: 'rent' },
  { nameKey: 'sugElectricity', name: 'كهرباء', nameEn: 'Electricity', category: 'utilities' },
  { nameKey: 'sugWater', name: 'ماء', nameEn: 'Water', category: 'utilities' },
  { nameKey: 'sugInternet', name: 'إنترنت', nameEn: 'Internet', category: 'subscription' },
  { nameKey: 'sugCar', name: 'سيارة', nameEn: 'Car payment', category: 'transport' },
  { nameKey: 'sugInsurance', name: 'تأمين', nameEn: 'Insurance', category: 'other' },
]

export default function FinancialProfileScreen({ navigation }) {
  const {
    monthlyIncome,
    fixedExpenses,
    totalFixedExpenses,
    saveMonthlyIncome,
    addExpense,
    removeExpense,
    formatMoney,
    t,
    isRTL,
  } = useAccount()
  const insets = useSafeAreaInsets()

  const [incomeInput, setIncomeInput] = useState(monthlyIncome ? String(monthlyIncome) : '')
  const [incomeSaved, setIncomeSaved] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameEnInput, setNameEnInput] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('other')

  const saveIncome = async () => {
    await saveMonthlyIncome(Number(incomeInput) || 0)
    setIncomeSaved(true)
    setTimeout(() => setIncomeSaved(false), 2000)
  }

  const openAdd = (preset) => {
    setNameInput(preset?.name || '')
    setNameEnInput(preset?.nameEn || '')
    setCategoryInput(preset?.category || 'other')
    setAmountInput('')
    setModalOpen(true)
  }

  const saveExpense = async () => {
    if (!nameInput.trim() || !(Number(amountInput) > 0)) return
    await addExpense({
      name: nameInput.trim(),
      nameEn: nameEnInput.trim(),
      amount: Number(amountInput),
      category: categoryInput,
    })
    setModalOpen(false)
  }

  const catLabel = (key) => {
    const c = CATEGORIES.find((x) => x.key === key)
    return c ? t(c.labelKey) : t('catOther')
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headRow, isRTL && styles.rtl]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.h1}>{t('financialProfile')}</Text>
        </View>
        <Text style={[styles.desc, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('financialProfileDesc')}
        </Text>

        <SectionTitle icon="trending-up">{t('monthlyIncome')}</SectionTitle>
        <View style={styles.card}>
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
          <TouchableOpacity style={styles.saveBtn} onPress={saveIncome} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>{t('save')}</Text>
          </TouchableOpacity>
          {incomeSaved && <Text style={styles.savedHint}>{t('saved')}</Text>}
        </View>

        <SectionTitle icon="list">{t('fixedExpenses')}</SectionTitle>
        <View style={styles.card}>
          {fixedExpenses.length === 0 ? (
            <Text style={styles.empty}>{t('noFixedExpenses')}</Text>
          ) : (
            fixedExpenses.map((e, i) => (
              <View
                key={e.id}
                style={[styles.expRow, isRTL && styles.rtl, i > 0 && styles.expSep]}
              >
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

          <TouchableOpacity style={[styles.addBtn, isRTL && styles.rtl]} onPress={() => openAdd()}>
            <Feather name="plus" size={18} color={theme.gold} />
            <Text style={styles.addBtnText}>{t('addExpense')}</Text>
          </TouchableOpacity>
        </View>

        <SectionTitle icon="zap">{t('suggestions')}</SectionTitle>
        <View style={styles.sugWrap}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s.nameKey} style={styles.sugChip} onPress={() => openAdd(s)}>
              <Feather name="plus" size={14} color={theme.gold} />
              <Text style={styles.sugText}>{isRTL ? s.name : t(s.nameKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.totalCard, isRTL && styles.rtl]}>
          <Text style={styles.totalLabel}>{t('totalFixedExpenses')}</Text>
          <Text style={styles.totalValue}>
            {formatMoney(totalFixedExpenses)} {t('currency')}
          </Text>
        </View>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={[styles.modalHead, isRTL && styles.rtl]}>
              <Text style={styles.modalTitle}>{t('newExpense')}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Feather name="x" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('expenseName')}
            </Text>
            <View style={[styles.inputWrap, isRTL && styles.rtl]}>
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t('expenseName')}
                placeholderTextColor={theme.textHint}
                value={nameInput}
                onChangeText={setNameInput}
              />
            </View>

            <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
              {`${t('expenseAmount')} (${t('currency')})`}
            </Text>
            <View style={[styles.inputWrap, isRTL && styles.rtl]}>
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={`0 ${t('currency')}`}
                placeholderTextColor={theme.textHint}
                value={amountInput}
                onChangeText={setAmountInput}
                keyboardType="numeric"
              />
            </View>

            <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('category')}
            </Text>
            <View style={styles.catWrap}>
              {CATEGORIES.map((c) => {
                const active = categoryInput === c.key
                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => setCategoryInput(c.key)}
                  >
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                      {t(c.labelKey)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!nameInput.trim() || !(Number(amountInput) > 0)) && { opacity: 0.4 },
              ]}
              onPress={saveExpense}
              disabled={!nameInput.trim() || !(Number(amountInput) > 0)}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  rtl: { flexDirection: 'row-reverse' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  h1: { color: theme.text, fontSize: 24, fontWeight: '800' },
  desc: { color: theme.textMuted, fontSize: 13, marginTop: 8, lineHeight: 20 },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.bg,
    borderRadius: theme.radius,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  input: { flex: 1, color: theme.text, fontSize: 16, paddingVertical: 13 },
  saveBtn: {
    backgroundColor: theme.gold,
    paddingVertical: 14,
    borderRadius: theme.radius,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: { color: theme.bg, fontSize: 15, fontWeight: '700' },
  savedHint: { color: theme.success, fontSize: 13, marginTop: 12, textAlign: 'center' },
  empty: { color: theme.textHint, fontSize: 14, textAlign: 'center', paddingVertical: 8 },
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
    backgroundColor: `${theme.gold}18`,
    paddingVertical: 13,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: `${theme.gold}40`,
    marginTop: 14,
  },
  addBtnText: { color: theme.gold, fontSize: 15, fontWeight: '700' },
  sugWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sugChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.bgCardLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sugText: { color: theme.text, fontSize: 13, fontWeight: '600' },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.bgCardLight,
    borderRadius: theme.radiusLg,
    padding: 18,
    marginTop: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  totalLabel: { color: theme.textMuted, fontSize: 14 },
  totalValue: { color: theme.gold, fontSize: 18, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: theme.bgCard,
    borderTopLeftRadius: theme.radiusLg,
    borderTopRightRadius: theme.radiusLg,
    padding: 22,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
  fieldLabel: { color: theme.textMuted, fontSize: 13, marginBottom: 8, marginTop: 14 },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  catChipActive: { backgroundColor: theme.gold, borderColor: theme.gold },
  catChipText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  catChipTextActive: { color: theme.bg },
})
