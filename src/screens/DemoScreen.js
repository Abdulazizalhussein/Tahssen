import React, { useRef, useState, useEffect } from 'react'
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

const tabs = ['احتيال', 'إنفاق', 'تعثر']

function FraudTab() {
  const bar = useRef(new Animated.Value(0)).current
  const [pct, setPct] = useState(0)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const id = bar.addListener(({ value }) => setPct(Math.round(value)))
    return () => bar.removeListener(id)
  }, [bar])

  const run = () => {
    setBlocked(false)
    bar.setValue(0)
    Animated.timing(bar, {
      toValue: 94,
      duration: 1600,
      useNativeDriver: false,
    }).start(() => setBlocked(true))
  }

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailValue, { color: colors.gold }]}>9,500 SAR</Text>
          <Text style={styles.detailKey}>المبلغ</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailValue}>مستفيد جديد</Text>
          <Text style={styles.detailKey}>المستفيد</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.scoreRow}>
          <Text style={styles.scoreValue}>{pct}%</Text>
          <Text style={styles.detailKey}>درجة الخطر</Text>
        </View>
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              {
                width: bar.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {blocked && (
          <View style={styles.blockedBadge}>
            <Text style={styles.blockedText}>تم إيقاف التحويل</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.runBtn} onPress={run} activeOpacity={0.85}>
        <Text style={styles.runText}>RUN DEMO</Text>
      </TouchableOpacity>
    </View>
  )
}

function SpendingTab() {
  const used = 82
  return (
    <View style={styles.card}>
      <View style={styles.gaugeWrap}>
        <View style={styles.gaugeOuter}>
          <View style={styles.gaugeInner}>
            <Text style={styles.gaugeValue}>{used}%</Text>
            <Text style={styles.gaugeLabel}>من الميزانية</Text>
          </View>
        </View>
      </View>
      <Text style={styles.gaugeSub}>تم استخدام {used}% هذا الشهر</Text>
      <View style={styles.warnBox}>
        <Text style={styles.warnText}>هذا الشراء سيتجاوز ميزانيتك</Text>
      </View>
    </View>
  )
}

function DistressTab() {
  const signals = [
    { sev: colors.danger, text: 'تأخر في سداد قسطين متتاليين' },
    { sev: colors.gold, text: 'ارتفاع نسبة الالتزامات إلى الدخل' },
    { sev: colors.teal, text: 'انخفاض الرصيد المتوسط الشهري' },
  ]
  return (
    <View style={styles.card}>
      {signals.map((s, i) => (
        <View key={i} style={styles.signalRow}>
          <Text style={styles.signalText}>{s.text}</Text>
          <View style={[styles.dot, { backgroundColor: s.sev }]} />
        </View>
      ))}
    </View>
  )
}

export default function DemoScreen() {
  const [active, setActive] = useState(0)
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.segment}>
          {tabs.map((t, i) => (
            <TouchableOpacity
              key={t}
              style={[styles.segBtn, active === i && styles.segBtnActive]}
              onPress={() => setActive(i)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segText, active === i && styles.segTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {active === 0 && <FraudTab />}
        {active === 1 && <SpendingTab />}
        {active === 2 && <DistressTab />}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 22, paddingBottom: 40 },
  segment: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  segBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  segBtnActive: { backgroundColor: colors.teal },
  segText: { color: colors.textMuted, fontWeight: '700', writingDirection: 'rtl' },
  segTextActive: { color: colors.white },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailKey: { color: colors.textMuted, fontSize: 15, writingDirection: 'rtl' },
  detailValue: { color: colors.white, fontSize: 15, fontWeight: '700', writingDirection: 'rtl' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 16 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 10,
  },
  scoreValue: { color: colors.white, fontSize: 40, fontWeight: '900' },
  barTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  barFill: { height: '100%', backgroundColor: colors.danger, borderRadius: 999 },
  blockedBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(229,62,62,0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 16,
  },
  blockedText: { color: colors.danger, fontWeight: '700', writingDirection: 'rtl' },
  runBtn: {
    backgroundColor: colors.gold,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  runText: { color: colors.navy, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  gaugeWrap: { alignItems: 'center', marginVertical: 10 },
  gaugeOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 14,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeInner: { alignItems: 'center' },
  gaugeValue: { color: colors.white, fontSize: 40, fontWeight: '900' },
  gaugeLabel: { color: colors.textMuted, fontSize: 13, writingDirection: 'rtl' },
  gaugeSub: {
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 8,
  },
  warnBox: {
    backgroundColor: 'rgba(229,62,62,0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
  },
  warnText: {
    color: colors.danger,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  signalText: { color: colors.white, fontSize: 15, writingDirection: 'rtl', textAlign: 'right' },
  dot: { width: 14, height: 14, borderRadius: 7 },
})
