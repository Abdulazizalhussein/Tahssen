import React, { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { theme } from '../theme'
import { useAccount } from '../context/AccountContext'
import { NoApiKey, ErrorBox, TypingDots } from '../components/ui'
import RiskMeter from '../components/RiskMeter'
import { getNextQuestion } from '../agents/transferAgent'
import { analyzeTransfer } from '../agents/fraudAgent'

const STEP = { DETAILS: 0, INTERROGATE: 1, ASSESS: 2, RESULT: 3 }

const REASON_TEXT = {
  lowAmount: 'مبلغ بسيط',
  knownService: 'خدمة أو جهة معروفة',
  crypto: 'مؤشر احتيال: عملة رقمية أو وعود ربح',
  social: 'مؤشر احتيال: طلب عبر وسائل التواصل الاجتماعي',
}

export default function TransferScreen({ navigation }) {
  const account = useAccount()
  const {
    apiKey,
    transactions,
    balance,
    monthlySpent,
    monthlyBudget,
    executeTransfer,
    blockTransfer,
    formatMoney,
    t,
    isRTL,
  } = account
  const insets = useSafeAreaInsets()

  const [step, setStep] = useState(STEP.DETAILS)
  const [beneficiary, setBeneficiary] = useState('')
  const [iban, setIban] = useState('')
  const [amount, setAmount] = useState('')

  const [messages, setMessages] = useState([]) // {role, content}
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const [assessment, setAssessment] = useState(null)
  const [result, setResult] = useState(null) // {blocked}
  const scrollRef = useRef(null)

  const previousTransfers = transactions.filter(
    (tx) => tx.beneficiary.trim().toLowerCase() === beneficiary.trim().toLowerCase() && !tx.blocked
  )
  const isNewBeneficiary = previousTransfers.length === 0

  const resetFlow = () => {
    setStep(STEP.DETAILS)
    setBeneficiary('')
    setIban('')
    setAmount('')
    setMessages([])
    setAnswer('')
    setAssessment(null)
    setResult(null)
    setError(null)
  }

  const validDetails =
    beneficiary.trim().length > 1 && Number(amount) > 0 && Number(amount) <= balance

  const runAssessment = useCallback(
    async (history, isPersonallyKnown = false) => {
      setStep(STEP.ASSESS)
      setBusy(true)
      setError(null)
      try {
        const res = await analyzeTransfer(apiKey, {
          beneficiary,
          amount: Number(amount),
          reason: history.find((m) => m.role === 'user')?.content || '',
          conversationHistory: history,
          previousTransfers: previousTransfers.map((p) => ({
            amount: p.amount,
            date: new Date(p.timestamp).toISOString().slice(0, 10),
          })),
          currentBalance: balance,
          monthlySpent,
          monthlyBudget,
          isPersonallyKnown,
        })
        setAssessment(res)
      } catch (e) {
        setError(humanError(e, t))
      } finally {
        setBusy(false)
      }
    },
    [apiKey, beneficiary, amount, previousTransfers, balance, monthlySpent, monthlyBudget, t]
  )

  // Routes a getNextQuestion result to the right UI branch.
  const handleQuestionResult = useCallback(
    async (history, result) => {
      const reasonText = result.reason || REASON_TEXT[result.reasonKey] || ''
      if (result.isPersonallyKnown) {
        setAssessment({ approved: false, isPersonallyKnown: true, riskScore: result.riskScore ?? 5 })
        setStep(STEP.ASSESS)
        return
      }
      if (result.skipRisk) {
        setAssessment({ approved: true, approvalKind: 'skip', riskScore: result.riskScore ?? 8, reasonKey: result.reasonKey })
        setStep(STEP.ASSESS)
        return
      }
      if (result.hasGuarantee) {
        setAssessment({ approved: true, approvalKind: 'guarantee', riskScore: result.riskScore ?? 15 })
        setStep(STEP.ASSESS)
        return
      }
      if (result.forceHighRisk) {
        setAssessment({
          riskScore: result.riskScore ?? 90,
          riskLevel: 'critical',
          recommendation: 'block',
          reasoning: reasonText || 'مؤشرات احتيال مرتفعة.',
          redFlags: ['نمط احتيال مرتفع'],
          predictions: ['هذا النمط مطابق لعمليات احتيال موثقة'],
        })
        setStep(STEP.ASSESS)
        return
      }
      if (result.done) {
        await runAssessment(history)
        return
      }
      setMessages([...history, { role: 'assistant', content: result.question }])
    },
    [runAssessment]
  )

  const startInterrogation = useCallback(async () => {
    setError(null)
    setStep(STEP.INTERROGATE)
    setBusy(true)
    try {
      const result = await getNextQuestion(apiKey, {
        beneficiary,
        amount: Number(amount),
        conversationHistory: [],
        previousTransfers,
      })
      await handleQuestionResult([], result)
    } catch (e) {
      setError(humanError(e, t))
    } finally {
      setBusy(false)
    }
  }, [apiKey, beneficiary, amount, previousTransfers, handleQuestionResult, t])

  const sendAnswer = useCallback(async () => {
    const text = answer.trim()
    if (!text || busy) return
    const history = [...messages, { role: 'user', content: text }]
    setMessages(history)
    setAnswer('')
    setBusy(true)
    setError(null)
    try {
      const result = await getNextQuestion(apiKey, {
        beneficiary,
        amount: Number(amount),
        conversationHistory: history,
        previousTransfers,
      })
      await handleQuestionResult(history, result)
    } catch (e) {
      setError(humanError(e, t))
    } finally {
      setBusy(false)
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
    }
  }, [answer, busy, messages, apiKey, beneficiary, amount, previousTransfers, handleQuestionResult, t])

  const confirm = () => {
    const payload = {
      beneficiary,
      iban,
      amount: Number(amount),
      reason: messages.find((m) => m.role === 'user')?.content || '',
      riskScore: assessment?.riskScore ?? 0,
      riskLevel: assessment?.riskLevel ?? 'low',
    }
    executeTransfer(payload)
    setResult({ blocked: false })
    setStep(STEP.RESULT)
  }

  const block = () => {
    const payload = {
      beneficiary,
      iban,
      amount: Number(amount),
      reason: messages.find((m) => m.role === 'user')?.content || '',
      riskScore: assessment?.riskScore ?? 0,
      riskLevel: assessment?.riskLevel ?? 'low',
    }
    blockTransfer(payload)
    setResult({ blocked: true })
    setStep(STEP.RESULT)
  }

  if (!apiKey && step === STEP.DETAILS) {
    return (
      <Screen insets={insets}>
        <Header t={t} step={step} isRTL={isRTL} />
        <NoApiKey onGoSettings={() => navigation.navigate('Settings')} />
      </Screen>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <Screen insets={insets} scrollRef={scrollRef}>
        <Header t={t} step={step} isRTL={isRTL} />

        {step === STEP.DETAILS && (
          <View>
            <Field
              label={t('beneficiaryName')}
              value={beneficiary}
              onChangeText={setBeneficiary}
              icon="user"
              isRTL={isRTL}
            />
            <Field
              label={t('iban')}
              value={iban}
              onChangeText={setIban}
              icon="credit-card"
              autoCapitalize="characters"
              isRTL={isRTL}
            />
            <Field
              label={`${t('amount')} (${t('currency')})`}
              value={amount}
              onChangeText={setAmount}
              icon="dollar-sign"
              keyboardType="numeric"
              isRTL={isRTL}
            />
            {Number(amount) > balance && (
              <Text style={styles.warnText}>{t('balance')}: {formatMoney(balance)}</Text>
            )}
            <PrimaryButton
              label={t('proceed')}
              disabled={!validDetails}
              onPress={startInterrogation}
              icon="arrow-right"
            />
          </View>
        )}

        {step === STEP.INTERROGATE && (
          <View style={{ flex: 1 }}>
            <SummaryChip beneficiary={beneficiary} amount={amount} formatMoney={formatMoney} t={t} />
            {messages.map((m, i) => (
              <ChatLine key={i} role={m.role} content={m.content} isRTL={isRTL} />
            ))}
            {busy && (
              <View style={styles.aiTyping}>
                <TypingDots />
              </View>
            )}
            {error && <ErrorBox message={error} onRetry={() => setError(null)} />}
          </View>
        )}

        {step === STEP.ASSESS && (
          <View>
            <SummaryChip beneficiary={beneficiary} amount={amount} formatMoney={formatMoney} t={t} />
            {busy || !assessment ? (
              <View style={styles.assessLoading}>
                <ActivityIndicator size="large" color={theme.gold} />
                <Text style={styles.assessLoadingText}>{t('analyzing')}</Text>
                {error && <ErrorBox message={error} />}
              </View>
            ) : assessment.approved ? (
              <ApprovedView kind={assessment.approvalKind} reasonKey={assessment.reasonKey} t={t} onConfirm={confirm} />
            ) : assessment.isPersonallyKnown ? (
              <KnownPersonView t={t} onConfirm={confirm} />
            ) : (
              <AssessmentView
                assessment={assessment}
                t={t}
                isRTL={isRTL}
                onConfirm={confirm}
                onBlock={block}
              />
            )}
          </View>
        )}

        {step === STEP.RESULT && (
          <ResultView
            blocked={result?.blocked}
            balance={balance}
            formatMoney={formatMoney}
            t={t}
            onDone={() => {
              resetFlow()
              navigation.navigate('Home')
            }}
            onAnother={resetFlow}
          />
        )}
      </Screen>

      {step === STEP.INTERROGATE && (
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }, isRTL && styles.rtl]}>
          <TextInput
            style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('typeAnswer')}
            placeholderTextColor={theme.textHint}
            value={answer}
            onChangeText={setAnswer}
            onSubmitEditing={sendAnswer}
            editable={!busy}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!answer.trim() || busy) && { opacity: 0.4 }]}
            onPress={sendAnswer}
            disabled={!answer.trim() || busy}
          >
            <Feather name="send" size={18} color={theme.bg} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

function Screen({ children, insets, scrollRef }) {
  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  )
}

function Header({ t, step, isRTL }) {
  const titles = [t('transferDetails'), t('intentReview'), t('riskAssessment'), '']
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[styles.h1, { textAlign: isRTL ? 'right' : 'left' }]}>{t('transfer')}</Text>
      <View style={[styles.steps, isRTL && styles.rtl]}>
        {[0, 1, 2, 3].map((s) => (
          <View key={s} style={[styles.stepDot, s <= step && styles.stepDotActive]} />
        ))}
      </View>
      {!!titles[step] && (
        <Text style={[styles.h2, { textAlign: isRTL ? 'right' : 'left' }]}>{titles[step]}</Text>
      )}
    </View>
  )
}

function Field({ label, icon, isRTL, ...props }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
      <View style={[styles.fieldWrap, isRTL && styles.rtl]}>
        <Feather name={icon} size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.fieldInput, { textAlign: isRTL ? 'right' : 'left' }]}
          placeholderTextColor={theme.textHint}
          {...props}
        />
      </View>
    </View>
  )
}

function PrimaryButton({ label, onPress, disabled, icon }) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, disabled && { opacity: 0.4 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
      {icon ? <Feather name={icon} size={18} color={theme.bg} /> : null}
    </TouchableOpacity>
  )
}

function SummaryChip({ beneficiary, amount, formatMoney, t }) {
  return (
    <View style={styles.summary}>
      <Feather name="user" size={15} color={theme.gold} />
      <Text style={styles.summaryText}>{beneficiary}</Text>
      <View style={styles.summaryDivider} />
      <Text style={styles.summaryAmount}>
        {formatMoney(Number(amount))} {t('currency')}
      </Text>
    </View>
  )
}

function ChatLine({ role, content, isRTL }) {
  const isAI = role === 'assistant'
  return (
    <View
      style={[
        styles.chatLine,
        isAI ? styles.chatAI : styles.chatUser,
        { alignSelf: isAI ? 'flex-start' : 'flex-end' },
      ]}
    >
      <Text
        style={[isAI ? styles.chatAIText : styles.chatUserText, { textAlign: isRTL ? 'right' : 'left' }]}
      >
        {content}
      </Text>
    </View>
  )
}

function riskBand(score) {
  if (score >= 80) return { key: 'riskCritical', color: '#D93025' }
  if (score >= 61) return { key: 'riskHigh', color: '#E8650A' }
  if (score >= 30) return { key: 'riskNotes', color: '#F5A623' }
  return { key: 'riskNormal', color: '#00857A' }
}

function AssessmentView({ assessment, t, isRTL, onConfirm, onBlock }) {
  const band = riskBand(assessment.riskScore)
  const color = band.color
  const label = t(band.key)
  const safe = assessment.recommendation === 'allow'
  return (
    <View>
      <View style={styles.meterWrap}>
        <RiskMeter score={assessment.riskScore} label={t('riskScore')} />
        <View style={[styles.levelPill, { backgroundColor: `${color}22`, borderColor: color }]}>
          <Text style={[styles.levelText, { color }]}>{label}</Text>
        </View>
      </View>

      {assessment.predictions.length > 0 && (
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('predictions')}
          </Text>
          {assessment.predictions.map((p, i) => (
            <ListLine key={i} text={p} icon="alert-triangle" color={theme.warning} isRTL={isRTL} />
          ))}
        </View>
      )}

      {assessment.redFlags.length > 0 && (
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('redFlags')}
          </Text>
          {assessment.redFlags.map((p, i) => (
            <ListLine key={i} text={p} icon="x" color={theme.danger} isRTL={isRTL} />
          ))}
        </View>
      )}

      {!!assessment.reasoning && (
        <View style={styles.reasonBox}>
          <Text style={[styles.blockTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('aiReasoning')}
          </Text>
          <Text style={[styles.reasonText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {assessment.reasoning}
          </Text>
        </View>
      )}

      {safe ? (
        <TouchableOpacity style={styles.safeBtn} onPress={onConfirm} activeOpacity={0.85}>
          <Feather name="check-circle" size={18} color={theme.bg} />
          <Text style={styles.safeBtnText}>{t('safeTransfer')} · {t('confirmTransfer')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ gap: 12, marginTop: 8 }}>
          <TouchableOpacity style={styles.blockBtn} onPress={onBlock} activeOpacity={0.85}>
            <Feather name="shield" size={18} color={theme.text} />
            <Text style={styles.blockBtnText}>{t('cancelTransfer')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.riskyBtn} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={styles.riskyBtnText}>{t('confirmDespiteRisk')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

function KnownPersonView({ t, onConfirm }) {
  return (
    <View style={styles.knownWrap}>
      <View style={styles.knownIcon}>
        <Feather name="check-circle" size={48} color={theme.success} />
      </View>
      <Text style={styles.knownTitle}>{t('safeKnownPerson')}</Text>
      <TouchableOpacity style={styles.safeBtn} onPress={onConfirm} activeOpacity={0.85}>
        <Feather name="check-circle" size={18} color={theme.bg} />
        <Text style={styles.safeBtnText}>{t('confirmTransfer')}</Text>
      </TouchableOpacity>
    </View>
  )
}

function ApprovedView({ kind, reasonKey, t, onConfirm }) {
  const title = kind === 'guarantee' ? t('verifiedInvoice') : t('approvedTitle')
  const subtitle =
    kind === 'skip' ? t(reasonKey === 'knownService' ? 'approvedKnownService' : 'approvedLowAmount') : ''
  return (
    <View style={styles.knownWrap}>
      <View style={[styles.knownIcon, { backgroundColor: `${theme.teal}22` }]}>
        <Feather name="check-circle" size={48} color={theme.teal} />
      </View>
      <Text style={styles.knownTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.approvedSubtitle}>{subtitle}</Text>}
      <TouchableOpacity
        style={[styles.safeBtn, { backgroundColor: theme.teal }]}
        onPress={onConfirm}
        activeOpacity={0.85}
      >
        <Feather name="check-circle" size={18} color={theme.bg} />
        <Text style={styles.safeBtnText}>{t('confirmTransfer')}</Text>
      </TouchableOpacity>
    </View>
  )
}

function ListLine({ text, icon, color, isRTL }) {
  return (
    <View style={[styles.listLine, isRTL && styles.rtl]}>
      <Feather name={icon} size={16} color={color} />
      <Text style={[styles.listText, { textAlign: isRTL ? 'right' : 'left' }]}>{text}</Text>
    </View>
  )
}

function ResultView({ blocked, balance, formatMoney, t, onDone, onAnother }) {
  const color = blocked ? theme.danger : theme.success
  return (
    <View style={styles.result}>
      <View style={[styles.resultIcon, { backgroundColor: `${color}22` }]}>
        <Feather name={blocked ? 'shield' : 'check'} size={42} color={color} />
      </View>
      <Text style={styles.resultTitle}>{blocked ? t('transferBlocked') : t('transferSuccess')}</Text>
      {!blocked && (
        <View style={styles.resultBalance}>
          <Text style={styles.resultBalanceLabel}>{t('newBalance')}</Text>
          <Text style={styles.resultBalanceValue}>
            {formatMoney(balance)} {t('currency')}
          </Text>
        </View>
      )}
      <TouchableOpacity style={styles.primaryBtn} onPress={onDone} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>{t('backToHome')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ marginTop: 14 }} onPress={onAnother}>
        <Text style={styles.anotherLink}>{t('transfer')}</Text>
      </TouchableOpacity>
    </View>
  )
}

function humanError(e, t) {
  if (e?.code === 'MISSING_API_KEY') return t('noApiKeyMsg')
  return e?.message || t('error')
}

const styles = StyleSheet.create({
  rtl: { flexDirection: 'row-reverse' },
  h1: { color: theme.text, fontSize: 26, fontWeight: '800' },
  h2: { color: theme.gold, fontSize: 15, fontWeight: '600', marginTop: 10 },
  steps: { flexDirection: 'row', gap: 6, marginTop: 12 },
  stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.border },
  stepDotActive: { backgroundColor: theme.gold },
  fieldLabel: { color: theme.textMuted, fontSize: 13, marginBottom: 8 },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  fieldInput: { flex: 1, color: theme.text, fontSize: 16, paddingVertical: 14 },
  warnText: { color: theme.danger, fontSize: 13, marginBottom: 12, marginTop: -6 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.gold,
    paddingVertical: 16,
    borderRadius: theme.radius,
    marginTop: 12,
  },
  primaryBtnText: { color: theme.bg, fontSize: 16, fontWeight: '700' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 18,
  },
  summaryText: { color: theme.text, fontSize: 14, fontWeight: '600' },
  summaryDivider: { width: 1, height: 16, backgroundColor: theme.border, marginHorizontal: 4 },
  summaryAmount: { color: theme.gold, fontSize: 14, fontWeight: '700', marginLeft: 'auto' },
  chatLine: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, marginBottom: 10 },
  chatAI: { backgroundColor: theme.bgCardLight, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.border },
  chatUser: { backgroundColor: theme.gold, borderBottomRightRadius: 4 },
  chatAIText: { color: theme.text, fontSize: 15, lineHeight: 22 },
  chatUserText: { color: '#1a1400', fontSize: 15, lineHeight: 22, fontWeight: '500' },
  aiTyping: {
    alignSelf: 'flex-start',
    backgroundColor: theme.bgCardLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: theme.bgCard,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.bg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
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
  assessLoading: { alignItems: 'center', gap: 16, paddingVertical: 40 },
  assessLoadingText: { color: theme.textMuted, fontSize: 15 },
  meterWrap: { alignItems: 'center', marginBottom: 20 },
  levelPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14, borderWidth: 1, marginTop: 8 },
  levelText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  block: { marginBottom: 18 },
  blockTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  listLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  listText: { color: theme.textMuted, fontSize: 14, flex: 1, lineHeight: 20 },
  reasonBox: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 18,
  },
  reasonText: { color: theme.text, fontSize: 14, lineHeight: 23 },
  knownWrap: { alignItems: 'center', paddingVertical: 24 },
  knownIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${theme.success}22`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  knownTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
  },
  approvedSubtitle: {
    color: theme.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 24,
  },
  safeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.success,
    paddingVertical: 16,
    borderRadius: theme.radius,
    marginTop: 8,
    alignSelf: 'stretch',
  },
  safeBtnText: { color: theme.bg, fontSize: 15, fontWeight: '700' },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.bgCardLight,
    paddingVertical: 16,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
  },
  blockBtnText: { color: theme.text, fontSize: 15, fontWeight: '700' },
  riskyBtn: { alignItems: 'center', paddingVertical: 14 },
  riskyBtnText: { color: theme.danger, fontSize: 14, fontWeight: '600' },
  result: { alignItems: 'center', paddingVertical: 30 },
  resultIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resultTitle: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 20 },
  resultBalance: { alignItems: 'center', marginBottom: 28 },
  resultBalanceLabel: { color: theme.textMuted, fontSize: 13, marginBottom: 4 },
  resultBalanceValue: { color: theme.gold, fontSize: 24, fontWeight: '800' },
  anotherLink: { color: theme.gold, fontSize: 14, fontWeight: '600' },
})
