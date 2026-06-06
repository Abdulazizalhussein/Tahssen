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
