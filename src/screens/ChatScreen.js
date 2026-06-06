import React, { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { theme } from '../theme'
import { useAccount } from '../context/AccountContext'
import MessageBubble from '../components/MessageBubble'
import { TypingDots, ErrorBox } from '../components/ui'
import { SUGGESTED_QUESTIONS } from '../i18n'
import { chat } from '../agents/chatAgent'

export default function ChatScreen({ navigation }) {
  const account = useAccount()
  const { t, isRTL, lang } = account
  const insets = useSafeAreaInsets()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  const send = useCallback(
    async (text) => {
      const content = (text ?? input).trim()
      if (!content || busy) return
      const history = [...messages, { role: 'user', content }]
      setMessages(history)
      setInput('')
      setBusy(true)
      setError(null)
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
      try {
        const reply = await chat(null, account, history)
        setMessages([...history, { role: 'assistant', content: reply }])
      } catch (e) {
        setError(e?.message || t('error'))
      } finally {
        setBusy(false)
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
      }
    },
    [input, busy, messages, account, t]
  )

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>{t('appName')}</Text>
        <Text style={styles.subtitle}>{t('tagline')}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View style={styles.welcome}>
            <Text style={styles.welcomeTitle}>{t('chatWithTahseen')}</Text>
            <Text style={styles.suggLabel}>{t('suggestedQuestions')}</Text>
            <View style={styles.chips}>
              {SUGGESTED_QUESTIONS[lang].map((q, i) => (
                <TouchableOpacity key={i} style={styles.chip} onPress={() => send(q)} activeOpacity={0.8}>
                  <Text style={styles.chipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} isRTL={isRTL} />
        ))}

        {busy && (
          <View style={styles.typingWrap}>
            <TypingDots />
          </View>
        )}
        {error && (
          <View style={{ marginTop: 10 }}>
            <ErrorBox message={error} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }, isRTL && styles.rtl]}>
        <TextInput
          style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
          placeholder={t('chatPlaceholder')}
          placeholderTextColor={theme.textHint}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
          editable={!busy}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || busy) && { opacity: 0.4 }]}
          onPress={() => send()}
          disabled={!input.trim() || busy}
        >
          <Feather name="send" size={18} color={theme.bg} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  rtl: { flexDirection: 'row-reverse' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.bgCard,
  },
  title: { color: theme.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  welcome: { paddingVertical: 20 },
  welcomeTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  suggLabel: { color: theme.textMuted, fontSize: 13, marginBottom: 12 },
  chips: { gap: 10 },
  chip: {
    backgroundColor: theme.bgCardLight,
    borderRadius: theme.radius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipText: { color: theme.text, fontSize: 14, textAlign: 'center' },
  typingWrap: {
    alignSelf: 'flex-start',
    backgroundColor: theme.bgCardLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 6,
    marginLeft: 40,
    borderWidth: 1,
    borderColor: theme.border,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: theme.bgCard,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: theme.bg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: theme.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
