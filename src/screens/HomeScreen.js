import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../theme'

const badges = ['SAMA', 'PDPL', 'شريعة', 'قابل للتفسير']

export default function HomeScreen() {
  const score = useRef(new Animated.Value(0)).current
  const [scoreText, setScoreText] = useState(0)

  useEffect(() => {
    const id = score.addListener(({ value }) => setScoreText(Math.round(value)))
    Animated.timing(score, {
      toValue: 94,
      duration: 1800,
      useNativeDriver: false,
    }).start()
    return () => score.removeListener(id)
  }, [score])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoRow}>
          <Text style={styles.logoAr}>تحصين</Text>
          <Text style={styles.logoEn}>TAHSEEN</Text>
        </View>

        <Text style={styles.hero}>حماية مالية استباقية لمصرف الإنماء</Text>
        <Text style={styles.subtitle}>يمنع الضرر المالي قبل وقوعه</Text>

        <View style={styles.card}>
          <View style={styles.blockedBadge}>
            <Text style={styles.blockedText}>تم إيقاف التحويل</Text>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreValue}>{scoreText}</Text>
            <Text style={styles.scoreLabel}>درجة الخطر</Text>
          </View>

          <Animated.View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  width: score.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </Animated.View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>مستفيد جديد</Text>
            <Text style={styles.detailKey}>المستفيد</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailValue, { color: colors.gold }]}>9,500 SAR</Text>
            <Text style={styles.detailKey}>المبلغ</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          {badges.map((b) => (
            <View key={b} style={styles.badge}>
              <Text style={styles.badgeText}>{b}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.cta} activeOpacity={0.85}>
          <Text style={styles.ctaText}>ابدأ التجربة</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 22, paddingBottom: 40 },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 28,
  },
  logoAr: { color: colors.white, fontSize: 26, fontWeight: '800' },
  logoEn: { color: colors.gold, fontSize: 13, letterSpacing: 3, fontWeight: '700' },
  hero: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 42,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 10,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  blockedBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(229,62,62,0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  blockedText: { color: colors.danger, fontWeight: '700', writingDirection: 'rtl' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  scoreValue: { color: colors.white, fontSize: 48, fontWeight: '900' },
  scoreLabel: { color: colors.textMuted, fontSize: 14, writingDirection: 'rtl' },
  barTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  barFill: { height: '100%', backgroundColor: colors.danger, borderRadius: 999 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 18 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailKey: { color: colors.textMuted, fontSize: 15, writingDirection: 'rtl' },
  detailValue: { color: colors.white, fontSize: 15, fontWeight: '700', writingDirection: 'rtl' },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 8,
  },
  badge: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.3)',
  },
  badgeText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  cta: {
    backgroundColor: colors.teal,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 28,
  },
  ctaText: { color: colors.white, fontSize: 18, fontWeight: '800', writingDirection: 'rtl' },
})
