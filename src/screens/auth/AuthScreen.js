import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { theme } from '../../theme'
import { useAccount } from '../../context/AccountContext'

const TAB = { REGISTER: 'register', LOGIN: 'login' }

export default function AuthScreen({ navigation }) {
  const { register, login, t, isRTL } = useAccount()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState(TAB.REGISTER)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const switchTab = useCallback((next) => {
    setTab(next)
    setError('')
    setPassword('')
    setConfirm('')
  }, [])

  const goMain = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
  }, [navigation])

  const submit = useCallback(async () => {
    if (busy) return
    setError('')
    const isRegister = tab === TAB.REGISTER

    if (name.trim().length < 2) return setError(t('errNameMin'))
    if (password.length < 6) return setError(t('errPasswordMin'))
    if (isRegister && password !== confirm) return setError(t('errPasswordMismatch'))

    setBusy(true)
    try {
      const res = isRegister
        ? await register(name, password)
        : await login(name, password)
      if (res.ok) {
        goMain()
      } else if (res.error === 'nameTaken') {
        setError(t('errNameTaken'))
      } else {
        setError(t('errInvalidCredentials'))
      }
    } catch (e) {
      setError(t('error'))
    } finally {
      setBusy(false)
    }
  }, [busy, tab, name, password, confirm, register, login, goMain, t])

  const isRegister = tab === TAB.REGISTER
  const align = isRTL ? 'right' : 'left'

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <MaterialCommunityIcons name="shield-check" size={40} color={theme.gold} />
          </View>
          <Text style={styles.appName}>تحصين</Text>
          <Text style={styles.tagline}>جهاز المناعة المالي</Text>
        </View>

        <View style={[styles.tabs, isRTL && styles.rtl]}>
          <Tab
            label={t('createAccount')}
            active={isRegister}
            onPress={() => switchTab(TAB.REGISTER)}
          />
          <Tab
            label={t('signIn')}
            active={!isRegister}
            onPress={() => switchTab(TAB.LOGIN)}
          />
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: align }]}>
            {isRegister ? t('createAccount') : t('signIn')}
          </Text>

          <InputField
            icon="user"
            placeholder={t('fullName')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            isRTL={isRTL}
          />

          <InputField
            icon="lock"
            placeholder={t('password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            autoCapitalize="none"
            isRTL={isRTL}
            rightIcon={showPass ? 'eye-off' : 'eye'}
            onRightIconPress={() => setShowPass((v) => !v)}
          />

          {isRegister && (
            <InputField
              icon="lock"
              placeholder={t('confirmPassword')}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              isRTL={isRTL}
            />
          )}

          {!!error && (
            <View style={[styles.errorRow, isRTL && styles.rtl]}>
              <Feather name="alert-circle" size={15} color={theme.danger} />
              <Text style={[styles.errorText, { textAlign: align }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, busy && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={theme.bg} />
            ) : (
              <Text style={styles.submitText}>
                {isRegister ? t('createAccountBtn') : t('signInBtn')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Tab({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function InputField({ icon, rightIcon, onRightIconPress, isRTL, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <View
      style={[
        styles.inputWrap,
        isRTL && styles.rtl,
        focused && styles.inputWrapFocused,
      ]}
    >
      <Feather name={icon} size={18} color={focused ? theme.gold : theme.textMuted} />
      <TextInput
        style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
        placeholderTextColor={theme.textHint}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {rightIcon ? (
        <TouchableOpacity onPress={onRightIconPress} hitSlop={10}>
          <Feather name={rightIcon} size={18} color={theme.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  rtl: { flexDirection: 'row-reverse' },
  brand: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.bgCardLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${theme.gold}55`,
    marginBottom: 16,
  },
  appName: { color: theme.text, fontSize: 34, fontWeight: '800', letterSpacing: 1 },
  tagline: { color: theme.gold, fontSize: 14, marginTop: 6, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: theme.radius - 2, alignItems: 'center' },
  tabActive: { backgroundColor: theme.gold },
  tabText: { color: theme.textMuted, fontSize: 15, fontWeight: '700' },
  tabTextActive: { color: theme.bg },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radiusLg,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTitle: { color: theme.text, fontSize: 20, fontWeight: '800', marginBottom: 18 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.bg,
    borderRadius: theme.radius,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 14,
  },
  inputWrapFocused: { borderColor: theme.gold },
  input: { flex: 1, color: theme.text, fontSize: 16, paddingVertical: 15 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: -2 },
  errorText: { color: theme.danger, fontSize: 13, flex: 1 },
  submitBtn: {
    backgroundColor: theme.gold,
    paddingVertical: 16,
    borderRadius: theme.radius,
    alignItems: 'center',
    marginTop: 6,
  },
  submitText: { color: theme.bg, fontSize: 16, fontWeight: '800' },
})
