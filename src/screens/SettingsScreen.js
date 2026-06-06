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

export default function SettingsScreen() {
  const { apiKey, setApiKey, balance, formatMoney, resetAccount, lang, toggleLang, t, isRTL } =
    useAccount()
  const insets = useSafeAreaInsets()
  const [keyInput, setKeyInput] = useState('')
  const [editing, setEditing] = useState(!apiKey)
  const [saved, setSaved] = useState(false)

  const masked = apiKey ? `${apiKey.slice(0, 5)}${'•'.repeat(12)}${apiKey.slice(-4)}` : ''

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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.h1, { textAlign: isRTL ? 'right' : 'left' }]}>{t('tabSettings')}</Text>

      <SectionTitle icon="key">{t('apiKey')}</SectionTitle>
      <View style={styles.card}>
        {!editing && apiKey ? (
          <View style={[styles.keyRow, isRTL && styles.rtl]}>
            <View style={[styles.keyMaskRow, isRTL && styles.rtl]}>
              <Feather name="check-circle" size={18} color={theme.success} />
              <Text style={styles.keyMask}>{masked}</Text>
            </View>
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Feather name="edit-2" size={18} color={theme.gold} />
            </TouchableOpacity>
          </View>
        ) : (
          <View>
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
                secureTextEntry
              />
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
})
