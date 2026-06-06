import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { theme } from '../theme'
import { useAccount } from '../context/AccountContext'
import AddBeneficiaryModal from '../components/AddBeneficiaryModal'

function formatDate(ms, lang) {
  if (!ms) return null
  const d = new Date(ms)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, today)) return lang === 'ar' ? 'اليوم' : 'Today'
  if (sameDay(d, yesterday)) return lang === 'ar' ? 'أمس' : 'Yesterday'
  return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' })
}

export default function BeneficiariesScreen({ navigation }) {
  const { beneficiaries, unblockBeneficiaryAction, t, isRTL, lang } = useAccount()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState('active')
  const [modal, setModal] = useState(false)

  const active = beneficiaries.filter((b) => b.status === 'active')
  const blocked = beneficiaries.filter((b) => b.status === 'blocked')
  const list = tab === 'active' ? active : blocked

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, isRTL && styles.rtl]}>
          <View style={[styles.titleRow, isRTL && styles.rtl]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.h1}>{t('beneficiaries')}</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, isRTL && styles.rtl]} onPress={() => setModal(true)} activeOpacity={0.85}>
            <Feather name="plus" size={16} color={theme.bg} />
            <Text style={styles.addBtnText}>{t('addBeneficiary')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.tabs, isRTL && styles.rtl]}>
          <TabBtn label={`${t('benActive')} (${active.length})`} active={tab === 'active'} onPress={() => setTab('active')} />
          <TabBtn label={`${t('benBlocked')} (${blocked.length})`} active={tab === 'blocked'} onPress={() => setTab('blocked')} />
        </View>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Feather name={tab === 'active' ? 'users' : 'slash'} size={30} color={theme.textHint} />
            <Text style={styles.emptyText}>{tab === 'active' ? t('benNoActive') : t('benNoBlocked')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12, marginTop: 16 }}>
            {list.map((b) =>
              b.status === 'active' ? (
                <ActiveCard key={b.id} b={b} t={t} isRTL={isRTL} lang={lang} />
              ) : (
                <BlockedCard key={b.id} b={b} t={t} isRTL={isRTL} onUnblock={() => unblockBeneficiaryAction(b.id)} />
              )
            )}
          </View>
        )}
      </ScrollView>

      <AddBeneficiaryModal visible={modal} onClose={() => setModal(false)} />
    </View>
  )
}

function TabBtn({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function ActiveCard({ b, t, isRTL, lang }) {
  const date = formatDate(b.lastTransferAt, lang)
  const sub = date
    ? `${t('benLastTransfer')}: ${date}${b.transferCount ? `  ×${b.transferCount}` : ''}`
    : t('benNoTransferYet')
  return (
    <View style={[styles.card, styles.cardActive, isRTL && styles.rtl]}>
      <View style={[styles.avatar, { backgroundColor: `${theme.teal}22` }]}>
        <Feather name="user" size={20} color={theme.teal} />
      </View>
      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        <Text style={styles.cardName}>{b.name}</Text>
        <Text style={styles.cardSub}>{sub}</Text>
        {!!b.bank && <Text style={styles.cardBank}>{b.bank}</Text>}
      </View>
    </View>
  )
}

function BlockedCard({ b, t, isRTL, onUnblock }) {
  return (
    <View style={[styles.card, styles.cardBlocked]}>
      <View style={[styles.blockedTop, isRTL && styles.rtl]}>
        <View style={[styles.avatar, { backgroundColor: `${theme.danger}22` }]}>
          <Feather name="slash" size={20} color={theme.danger} />
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={styles.cardName}>{b.name}</Text>
          <Text style={[styles.blockedReason, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('benBlockedLabel')}: {b.blockedReason || t('benBlockedLabel')}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.unblockBtn} onPress={onUnblock} activeOpacity={0.85}>
        <Feather name="unlock" size={15} color={theme.text} />
        <Text style={styles.unblockText}>{t('benUnblock')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  rtl: { flexDirection: 'row-reverse' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { padding: 2 },
  h1: { color: theme.text, fontSize: 24, fontWeight: '800' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.gold,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius,
  },
  addBtnText: { color: theme.bg, fontSize: 14, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    padding: 4,
    borderWidth: 0.5,
    borderColor: theme.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 10 },
  tabActive: { backgroundColor: theme.bgCardLight },
  tabText: { color: theme.textMuted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: theme.text, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyText: { color: theme.textHint, fontSize: 14 },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    padding: 16,
    borderWidth: 0.5,
    borderColor: theme.border,
  },
  cardActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderLeftWidth: 3,
    borderLeftColor: theme.teal,
  },
  cardBlocked: {
    borderLeftWidth: 3,
    borderLeftColor: theme.danger,
  },
  blockedTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { color: theme.text, fontSize: 16, fontWeight: '700' },
  cardSub: { color: theme.textMuted, fontSize: 13, marginTop: 4 },
  cardBank: { color: theme.textHint, fontSize: 12, marginTop: 2 },
  blockedReason: { color: theme.danger, fontSize: 13, marginTop: 4, lineHeight: 19 },
  unblockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.bgCardLight,
    paddingVertical: 12,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.borderLight,
    marginTop: 14,
  },
  unblockText: { color: theme.text, fontSize: 14, fontWeight: '700' },
})
