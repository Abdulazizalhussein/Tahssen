import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { theme } from '../theme'
import { useAccount } from '../context/AccountContext'

export function SectionTitle({ children, icon }) {
  const { isRTL } = useAccount()
  return (
    <View style={[styles.titleRow, isRTL && styles.rtl]}>
      {icon ? <Feather name={icon} size={16} color={theme.gold} /> : null}
      <Text style={styles.title}>{children}</Text>
    </View>
  )
}

export function NoApiKey({ onGoSettings }) {
  const { t } = useAccount()
  return (
    <View style={styles.noKey}>
      <View style={styles.noKeyIcon}>
        <Feather name="key" size={26} color={theme.warning} />
      </View>
      <Text style={styles.noKeyTitle}>{t('noApiKeyTitle')}</Text>
      <Text style={styles.noKeyMsg}>{t('noApiKeyMsg')}</Text>
      <TouchableOpacity style={styles.noKeyBtn} onPress={onGoSettings} activeOpacity={0.85}>
        <Feather name="settings" size={16} color={theme.bg} />
        <Text style={styles.noKeyBtnText}>{t('goToSettings')}</Text>
      </TouchableOpacity>
    </View>
  )
}

export function ErrorBox({ message, onRetry }) {
  const { t } = useAccount()
  return (
    <View style={styles.errorBox}>
      <Feather name="alert-triangle" size={18} color={theme.danger} />
      <Text style={styles.errorText}>{message || t('error')}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry}>
          <Text style={styles.retry}>{t('tryAgain')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export function TypingDots() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current]
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      )
    )
    anims.forEach((a) => a.start())
    return () => anims.forEach((a) => a.stop())
  }, [])
  return (
    <View style={styles.typing}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[styles.typingDot, { opacity: d }]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 24 },
  rtl: { flexDirection: 'row-reverse' },
  title: { color: theme.text, fontSize: 16, fontWeight: '700' },
  noKey: {
    backgroundColor: theme.bgCardLight,
    borderRadius: theme.radiusLg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  noKeyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${theme.warning}22`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  noKeyTitle: { color: theme.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  noKeyMsg: { color: theme.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  noKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.gold,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius,
  },
  noKeyBtnText: { color: theme.bg, fontSize: 15, fontWeight: '700' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${theme.danger}18`,
    borderWidth: 1,
    borderColor: `${theme.danger}55`,
    borderRadius: theme.radius,
    padding: 14,
  },
  errorText: { color: theme.text, fontSize: 14, flex: 1 },
  retry: { color: theme.danger, fontSize: 14, fontWeight: '700' },
  typing: { flexDirection: 'row', gap: 5, paddingVertical: 4 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.textMuted },
})
