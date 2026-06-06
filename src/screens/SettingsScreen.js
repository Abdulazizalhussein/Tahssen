import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { theme } from '../theme'
import { useAccount } from '../context/AccountContext'
import { SectionTitle } from '../components/ui'

export default function SettingsScreen({ navigation }) {
  const {
    apiKey,
    setApiKey,
    balance,
    formatMoney,
    resetAccount,
    logout,
    userName,
    memberSince,
    lang,
    toggleLang,
    t,
    isRTL,
  } = useAccount()
  const insets = useSafeAreaInsets()
  const [keyInput, setKeyInput] = useState('')
  const [editing, setEditing] = useState(!apiKey)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const masked = apiKey ? `${apiKey.slice(0, 5)}${'•'.repeat(12)}${apiKey.slice(-4)}` : ''
  const memberSinceDate = memberSince ? memberSince.slice(0, 10) : ''

  const save = async () => {
    await setApiKey(keyInput)
    setKeyInput('')
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const confirmReset = () => {
    Alert.alert(t('resetAccount'), '', [
      { text: t('cancelTransfer'), style: 'cancel' },
      { text: t('resetAccount'), style: 'destructive', onPress: resetAccount },
    ])
  }

  const confirmSignOut = () => {
    Alert.alert(t('signOut'), t('confirmSignOut'), [
      { text: t('cancelTransfer'), style: 'cancel' },
      {
        text: t('signOut'),
        style: 'destructive',
        onPress: async () => {
          await logout()
          const root = navigation.getParent() || navigation
          root.reset({ index: 0, routes: [{ name: 'Auth' }] })
        },
      },
    ])
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.h1, { textAlign: isRTL ? 'right' : 'left' }]}>{t('tabSettings')}</Text>

      <View style={[styles.userCard, isRTL && styles.rtl]}>
        <View style={styles.avatar}>
          <Feather name="user" size={24} color={theme.gold} />
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={styles.userName}>{userName || '—'}</Text>
          {!!memberSinceDate && (
            <Text style={styles.userSince}>
              {t('memberSince')} {memberSinceDate}
            </Text>
          )}
        </View>
      </View>

      <SectionTitle icon="key">{t('apiKey')}</SectionTitle>
      <View style={styles.card}>
        {!editing && apiKey ? (
          <View>
            <View style={[styles.keyRow, isRTL && styles.rtl]}>
              <View style={[styles.keyMaskRow, isRTL && styles.rtl]}>
                <Feather name="check-circle" size={18} color={theme.success} />
                <Text style={styles.keyMask}>{masked}</Text>
              </View>
              <TouchableOpacity
                style={[styles.changeBtn, isRTL && styles.rtl]}
                onPress={() => setEditing(true)}
              >
                <Feather name="edit-2" size={15} color={theme.gold} />
                <Text style={styles.changeText}>{t('changeKey')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={[styles.requiredBanner, isRTL && styles.rtl]}>
              <Feather name="alert-circle" size={18} color={theme.warning} />
              <Text style={[styles.requiredText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('apiKeyRequired')}
              </Text>
            </View>
            <Text style={[styles.instructions, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('apiKeyInstructions')}
            </Text>
            <Text style={[styles.linkText, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('apiKeyGetLink')}
            </Text>
            <View style={[styles.inputWrap, isRTL && styles.rtl]}>
              <Feather name="key" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t('apiKeyPlaceholder')}
                placeholderTextColor={theme.textHint}
                value={keyInput}
                onChangeText={setKeyInput}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showKey}
              />
              <TouchableOpacity onPress={() => setShowKey((s) => !s)}>
                <Feather name={showKey ? 'eye-off' : 'eye'} size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, !keyInput.trim() && { opacity: 0.4 }]}
              onPress={save}
              disabled={!keyInput.trim()}
            >
              <Text style={styles.saveBtnText}>{t('saveKey')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {saved && <Text style={styles.savedHint}>{t('keySaved')}</Text>}
      </View>

      <SectionTitle icon="trending-up">{t('financialProfile')}</SectionTitle>
      <TouchableOpacity
        style={[styles.navRow, isRTL && styles.rtl]}
        onPress={() => navigation.navigate('FinancialProfile')}
        activeOpacity={0.85}
      >
        <View style={[styles.navLeft, isRTL && styles.rtl]}>
          <View style={styles.navIcon}>
            <Feather name="trending-up" size={18} color={theme.gold} />
          </View>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={styles.navTitle}>{t('financialProfile')}</Text>
            <Text style={styles.navDesc} numberOfLines={1}>
              {t('financialProfileDesc')}
            </Text>
          </View>
        </View>
        <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={theme.textMuted} />
      </TouchableOpacity>

      <SectionTitle icon="globe">{t('language')}</SectionTitle>
      <View style={styles.card}>
        <View style={[styles.langRow, isRTL && styles.rtl]}>
          <LangBtn label="العربية" active={lang === 'ar'} onPress={() => lang !== 'ar' && toggleLang()} />
          <LangBtn label="English" active={lang === 'en'} onPress={() => lang !== 'en' && toggleLang()} />
        </View>
      </View>

      <SectionTitle icon="credit-card">{t('account')}</SectionTitle>
      <View style={styles.card}>
        <View style={[styles.accRow, isRTL && styles.rtl]}>
          <Text style={styles.accLabel}>{t('balance')}</Text>
          <Text style={styles.accValue}>
            {formatMoney(balance)} {t('currency')}
          </Text>
        </View>
        <TouchableOpacity style={[styles.resetBtn, isRTL && styles.rtl]} onPress={confirmReset}>
          <Feather name="refresh-cw" size={16} color={theme.danger} />
          <Text style={styles.resetText}>{t('resetAccount')}</Text>
        </TouchableOpacity>
      </View>

      <SectionTitle icon="info">{t('aboutTahseen')}</SectionTitle>
      <View style={styles.card}>
        <Text style={[styles.aboutText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('aboutText')}</Text>
      </View>

      <TouchableOpacity style={[styles.signOutBtn, isRTL && styles.rtl]} onPress={confirmSignOut} activeOpacity={0.85}>
        <Feather name="log-out" size={18} color={theme.danger} />
        <Text style={styles.signOutText}>{t('signOut')}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function LangBtn({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.langBtn, active && styles.langBtnActive]} onPress={onPress}>
      <Text style={[styles.langBtnText, active && styles.langBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  rtl: { flexDirection: 'row-reverse' },
  h1: { color: theme.text, fontSize: 26, fontWeight: '800' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.bgCardLight,
    borderRadius: theme.radiusLg,
    padding: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${theme.gold}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { color: theme.text, fontSize: 18, fontWeight: '800' },
  userSince: { color: theme.textMuted, fontSize: 13, marginTop: 3 },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  keyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  keyMaskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  keyMask: { color: theme.text, fontSize: 14, fontFamily: 'Courier', flexShrink: 1 },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  changeText: { color: theme.gold, fontSize: 13, fontWeight: '700' },
  requiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${theme.warning}18`,
    borderWidth: 1,
    borderColor: `${theme.warning}55`,
    borderRadius: theme.radius,
    padding: 12,
    marginBottom: 14,
  },
  requiredText: { color: theme.text, fontSize: 13, fontWeight: '700', flex: 1 },
  instructions: { color: theme.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  linkText: { color: theme.gold, fontSize: 13, fontWeight: '600', marginBottom: 14 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.gold}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: { color: theme.text, fontSize: 15, fontWeight: '700' },
  navDesc: { color: theme.textMuted, fontSize: 12, marginTop: 3, maxWidth: 220 },
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
  input: { flex: 1, color: theme.text, fontSize: 15, paddingVertical: 13 },
  saveBtn: {
    backgroundColor: theme.gold,
    paddingVertical: 14,
    borderRadius: theme.radius,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: { color: theme.bg, fontSize: 15, fontWeight: '700' },
  savedHint: { color: theme.success, fontSize: 13, marginTop: 12, textAlign: 'center' },
  langRow: { flexDirection: 'row', gap: 12 },
  langBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius,
    alignItems: 'center',
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  langBtnActive: { backgroundColor: theme.gold, borderColor: theme.gold },
  langBtnText: { color: theme.textMuted, fontSize: 15, fontWeight: '600' },
  langBtnTextActive: { color: theme.bg },
  accRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  accLabel: { color: theme.textMuted, fontSize: 14 },
  accValue: { color: theme.gold, fontSize: 16, fontWeight: '700' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: `${theme.danger}18`,
    paddingVertical: 14,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: `${theme.danger}40`,
  },
  resetText: { color: theme.danger, fontSize: 15, fontWeight: '700' },
  aboutText: { color: theme.textMuted, fontSize: 14, lineHeight: 23 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: `${theme.danger}18`,
    paddingVertical: 16,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: `${theme.danger}40`,
    marginTop: 28,
  },
  signOutText: { color: theme.danger, fontSize: 15, fontWeight: '700' },
})
