import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { theme, riskColorByScore } from '../theme'

export default function RiskMeter({ score = 0, size = 180, label }) {
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const dash = (clamped / 100) * circumference
  const color = riskColorByScore(clamped)
  const center = size / 2

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { color }]}>{clamped}</Text>
        {!!label && <Text style={styles.label}>{label}</Text>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center' },
  score: { fontSize: 48, fontWeight: '800' },
  label: { color: theme.textMuted, fontSize: 13, marginTop: 2 },
})
