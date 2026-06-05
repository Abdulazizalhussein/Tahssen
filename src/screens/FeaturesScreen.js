import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../theme'

const features = [
  {
    icon: '🛡️',
    title: 'إيقاف الاحتيال',
    desc: 'اعتراض التحويلات المشبوهة قبل تنفيذها',
  },
  {
    icon: '💰',
    title: 'ضبط الإنفاق',
    desc: 'تنبيه قبل أي شراء يفوق إمكانياتك',
  },
  {
    icon: '📊',
    title: 'رصد التعثر',
    desc: 'مؤشرات إنذار مبكر مع خطط إعادة هيكلة',
  },
]

export default function FeaturesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>ثلاثة محاور حماية</Text>
        {features.map((f) => (
          <View key={f.title} style={styles.card}>
            <Text style={styles.icon}>{f.icon}</Text>
            <View style={styles.textCol}>
              <Text style={styles.cardTitle}>{f.title}</Text>
              <Text style={styles.cardDesc}>{f.desc}</Text>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 16,
  },
  icon: { fontSize: 40 },
  textCol: { flex: 1 },
  cardTitle: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 6,
  },
  cardDesc: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 22,
  },
})
