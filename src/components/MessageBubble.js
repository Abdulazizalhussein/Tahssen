import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { theme } from '../theme'

export default function MessageBubble({ role, content, isRTL }) {
  const isUser = role === 'user'
  if (isUser) {
    return (
      <View style={[styles.wrap, styles.userWrap]}>
        <View style={[styles.bubble, styles.userBubble]}>
          <Text style={[styles.userText, { textAlign: isRTL ? 'right' : 'left' }]}>{content}</Text>
        </View>
      </View>
    )
  }
  return (
    <View style={[styles.wrap, styles.aiWrap]}>
      <View style={styles.avatar}>
        <MaterialCommunityIcons name="shield-check" size={18} color={theme.gold} />
      </View>
      <View style={[styles.bubble, styles.aiBubble]}>
        <Text style={[styles.aiText, { textAlign: isRTL ? 'right' : 'left' }]}>{content}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', marginVertical: 6, maxWidth: '88%' },
  userWrap: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  aiWrap: { alignSelf: 'flex-start', gap: 8 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.bgCardLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    flexShrink: 1,
  },
  userBubble: { backgroundColor: theme.gold, borderBottomRightRadius: 4 },
  aiBubble: {
    backgroundColor: theme.bgCardLight,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  userText: { color: '#1a1400', fontSize: 15, lineHeight: 21, fontWeight: '500' },
  aiText: { color: theme.text, fontSize: 15, lineHeight: 22 },
})
