import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../theme'

const steps = [
  { n: '1️⃣', title: 'موافقة العميل', desc: 'موافقة صريحة وقابلة للسحب' },
  { n: '2️⃣', title: 'توحيد البيانات', desc: 'قراءة الحسابات لحظياً' },
  { n: '3️⃣', title: 'استدلال شفّاف', desc: 'محرّك بقرار قابل للتفسير' },
  { n: '4️⃣', title: 'تدخّل وقائي', desc: 'تنبيه أو إيقاف حسب الخطر' },
]

export default function HowItWorksScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>كيف يعمل</Text>
        <View style={styles.timeline}>
          {steps.map((s, i) => (
            <View key={s.title} style={styles.stepRow}>
              <View style={styles.markerCol}>
                <View style={styles.marker}>
                  <Text style={styles.markerText}>{s.n}</Text>
                </View>
                {i < steps.length - 1 && <View style={styles.line} />}
              </View>
              <View style={styles.stepCard}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 22, paddingBottom: 40 },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 24,
  },
  timeline: { flexDirection: 'column' },
  stepRow: { flexDirection: 'row-reverse', gap: 16 },
  markerCol: { alignItems: 'center', width: 48 },
  marker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: { fontSize: 22 },
  line: { width: 2, flex: 1, backgroundColor: 'rgba(201,162,39,0.4)', marginVertical: 4 },
  stepCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stepTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 6,
  },
  stepDesc: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 22,
  },
})
