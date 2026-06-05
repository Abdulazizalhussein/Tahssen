import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../theme'

const audit = [
  { key: 'Model', value: 'tahseen-reasoner-1.0.0' },
  { key: 'Policy', value: 'sama-aligned-2025.1' },
  { key: 'Input fingerprint', value: '7f3a9c21' },
  { key: 'Rules activated', value: '6' },
]

const log = [
  { tag: 'احتيال', color: colors.danger, text: 'إيقاف تحويل 9,500 SAR لمستفيد جديد', time: '10:24' },
  { tag: 'إنفاق', color: colors.gold, text: 'تنبيه تجاوز ميزانية الترفيه', time: '09:11' },
  { tag: 'تعثر', color: colors.teal, text: 'مؤشر إنذار مبكر — اقتراح إعادة هيكلة', time: 'أمس' },
]

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>لوحة المصرف</Text>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>سجل التدقيق</Text>
          {audit.map((a) => (
            <View key={a.key} style={styles.auditRow}>
              <Text style={styles.auditValue}>{a.value}</Text>
              <Text style={styles.auditKey}>{a.key}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>سجل القرارات</Text>
        {log.map((l, i) => (
          <View key={i} style={styles.logCard}>
            <View style={styles.logTop}>
              <Text style={styles.logTime}>{l.time}</Text>
              <View style={[styles.logTag, { borderColor: l.color }]}>
                <Text style={[styles.logTagText, { color: l.color }]}>{l.tag}</Text>
              </View>
            </View>
            <Text style={styles.logText}>{l.text}</Text>
          </View>
        ))}
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
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 16,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  auditKey: { color: colors.textMuted, fontSize: 14 },
  auditValue: { color: colors.white, fontSize: 14, fontWeight: '700', fontFamily: 'Courier' },
  sectionTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 28,
    marginBottom: 14,
  },
  logCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logTime: { color: colors.textMuted, fontSize: 13 },
  logTag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  logTagText: { fontSize: 13, fontWeight: '700', writingDirection: 'rtl' },
  logText: { color: colors.white, fontSize: 15, textAlign: 'right', writingDirection: 'rtl', lineHeight: 22 },
})
