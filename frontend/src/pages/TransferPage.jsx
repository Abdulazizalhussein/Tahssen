import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  User,
  Users,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Send,
  CheckCircle2,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Check,
} from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import { ErrorBox, TypingDots } from '../components/ui'
import RiskMeter from '../components/RiskMeter'
import RiyalSymbol from '../components/RiyalSymbol'
import { getNextQuestion } from '../agents/transferAgent'
import { analyzeTransfer } from '../agents/fraudAgent'
import './TransferPage.css'

// ── Step constants ────────────────────────────────────────────
const STEP = { PICK: 0, AMOUNT: 1, INTERROGATE: 2, ASSESS: 3, RESULT: 4 }

// ── Risk band helper (score → label key + color) ──────────────
function riskBand(score) {
  if (score >= 80) return { key: 'riskCritical', color: 'var(--danger)' }
  if (score >= 61) return { key: 'riskHigh',     color: '#E8650A' }
  if (score >= 30) return { key: 'riskNotes',    color: 'var(--warning)' }
  return               { key: 'riskNormal',       color: 'var(--teal)' }
}

// ── Error humaniser ───────────────────────────────────────────
function humanError(e, t) {
  if (e?.code === 'MISSING_API_KEY') return t('noApiKeyMsg')
  return e?.message || t('error')
}

// ─────────────────────────────────────────────────────────────
//  AddBeneficiaryModal — inline (no separate file needed here,
//  matches AddBeneficiaryModal contract: visible + onClose)
// ─────────────────────────────────────────────────────────────
function AddBeneficiaryModal({ visible, onClose }) {
  const { t, isRTL, addBeneficiary } = useAccount()
  const [name, setName] = useState('')
  const [iban, setIban] = useState('')
  const [bank, setBank] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const nameRef = useRef(null)

  useEffect(() => {
    if (visible) {
      setName(''); setIban(''); setBank(''); setErr('')
      // Focus name field after animation settles
      setTimeout(() => nameRef.current?.focus(), 120)
    }
  }, [visible])

  // Close on overlay click
  const onOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [visible, onClose])

  if (!visible) return null

  const handleSave = async () => {
    if (!name.trim()) { setErr(t('benName')); return }
    setSaving(true)
    try {
      await addBeneficiary({ name: name.trim(), iban: iban.trim(), bank: bank.trim() })
      onClose()
    } catch {
      setErr(t('error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="transfer-modal-overlay" onClick={onOverlayClick} role="dialog" aria-modal="true" aria-label={t('newBeneficiary')}>
      <div className="transfer-modal-sheet">
        <div className="transfer-modal-header">
          <span className="transfer-modal-title">{t('newBeneficiary')}</span>
          <button className="transfer-modal-close" onClick={onClose} aria-label={t('dismiss')}>
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        <ModalField label={t('benName')} value={name} onChange={setName} inputRef={nameRef} placeholder={t('benName')} />
        <ModalField label={t('benIban')} value={iban} onChange={setIban} placeholder={t('benIban')} />
        <ModalField label={t('benBank')} value={bank} onChange={setBank} placeholder={t('benBank')} />

        {err && <p style={{ color: 'var(--danger)', fontSize: 13, marginBlockEnd: 12 }}>{err}</p>}

        <button
          className="transfer-primary-btn"
          onClick={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? <span className="spinner" /> : null}
          {t('save')}
        </button>
      </div>
    </div>
  )
}

function ModalField({ label, value, onChange, placeholder, inputRef }) {
  return (
    <div className="transfer-field">
      <label className="transfer-field-label">{label}</label>
      <div className="transfer-field-wrap">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="transfer-field-input"
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  TransferPage
// ─────────────────────────────────────────────────────────────
export default function TransferPage() {
  const navigate = useNavigate()
  const account = useAccount()
  const {
    transactions,
    beneficiaries,
    balance,
    monthlySpent,
    monthlyBudget,
    executeTransfer,
    blockTransfer,
    formatMoney,
    t,
    isRTL,
    lang,
  } = account

  // ── Step state ────────────────────────────────────────────
  const [step, setStep] = useState(STEP.PICK)
  const [beneficiary, setBeneficiary] = useState('')
  const [iban, setIban] = useState('')
  const [amount, setAmount] = useState('')
  const [search, setSearch] = useState('')
  const [addModal, setAddModal] = useState(false)

  // ── Chat state ────────────────────────────────────────────
  const [messages, setMessages] = useState([])  // {role, content}
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // ── Assessment + result ───────────────────────────────────
  const [assessment, setAssessment] = useState(null)
  const [result, setResult] = useState(null)  // {blocked}
  const [committing, setCommitting] = useState(false)  // guards confirm/block against double-submit

  // Scroll-to-bottom ref for chat
  const scrollRef = useRef(null)
  const chatEndRef = useRef(null)
  const answerRef = useRef(null)

  // ── Derived values ────────────────────────────────────────
  const previousTransfers = transactions.filter(
    (tx) =>
      tx.beneficiary.trim().toLowerCase() === beneficiary.trim().toLowerCase() &&
      !tx.blocked
  )

  const activeBeneficiaries = beneficiaries.filter((b) => b.status === 'active')
  const filteredBeneficiaries = activeBeneficiaries.filter((b) =>
    b.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  const validAmount = Number(amount) > 0 && Number(amount) <= balance

  // ── Auto-scroll chat to bottom ────────────────────────────
  useEffect(() => {
    if (step === STEP.INTERROGATE) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, busy, step])

  // ── Auto-focus the answer input when a question is waiting ──
  useEffect(() => {
    if (step === STEP.INTERROGATE && !busy) answerRef.current?.focus()
  }, [step, busy, messages])

  // ── Reset ─────────────────────────────────────────────────
  const resetFlow = () => {
    setStep(STEP.PICK)
    setBeneficiary('')
    setIban('')
    setAmount('')
    setSearch('')
    setMessages([])
    setAnswer('')
    setAssessment(null)
    setResult(null)
    setError(null)
  }

  // ── Pick beneficiary ──────────────────────────────────────
  const pickBeneficiary = (b) => {
    if (b.status === 'blocked') {
      // Show inline blocked notice instead of Alert.alert
      setError(`${t('blockedBenTitle')}: ${b.blockedReason || ''} — ${t('cannotTransferBlocked')}`)
      return
    }
    setError(null)
    setBeneficiary(b.name)
    setIban(b.iban || '')
    setStep(STEP.AMOUNT)
  }

  // ── Run full risk assessment ──────────────────────────────
  const runAssessment = useCallback(
    async (history, isPersonallyKnown = false) => {
      setStep(STEP.ASSESS)
      setBusy(true)
      setError(null)
      try {
        const res = await analyzeTransfer({
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
          lang,
        })
        setAssessment(res)
      } catch (e) {
        setError(humanError(e, t))
      } finally {
        setBusy(false)
      }
    },
    [beneficiary, amount, previousTransfers, balance, monthlySpent, monthlyBudget, t, lang]
  )

  // ── Route a getNextQuestion result to the correct UI branch ──
  const handleQuestionResult = useCallback(
    async (history, qResult) => {
      const reasonText = qResult.reason || ''

      if (qResult.isPersonallyKnown) {
        setAssessment({ approved: false, isPersonallyKnown: true, riskScore: qResult.riskScore ?? 5 })
        setStep(STEP.ASSESS)
        return
      }
      if (qResult.skipRisk) {
        setAssessment({
          approved: true,
          approvalKind: 'skip',
          riskScore: qResult.riskScore ?? 8,
          reasonKey: qResult.reasonKey,
        })
        setStep(STEP.ASSESS)
        return
      }
      if (qResult.hasGuarantee) {
        setAssessment({ approved: true, approvalKind: 'guarantee', riskScore: qResult.riskScore ?? 15 })
        setStep(STEP.ASSESS)
        return
      }
      if (qResult.forceHighRisk) {
        setAssessment({
          riskScore: qResult.riskScore ?? 90,
          riskLevel: 'critical',
          recommendation: 'block',
          reasoning: reasonText || t('reasonHighRisk'),
          redFlags: qResult.redFlags?.length ? qResult.redFlags : [t('flagHighRisk')],
          predictions: qResult.predictions?.length ? qResult.predictions : [t('predHighRisk')],
        })
        setStep(STEP.ASSESS)
        return
      }
      if (qResult.done) {
        await runAssessment(history)
        return
      }
      // Another question — append to messages and stay in INTERROGATE
      setMessages([...history, { role: 'assistant', content: qResult.question }])
    },
    [runAssessment]
  )

  // ── Start interrogation (called from AMOUNT step) ─────────
  const startInterrogation = useCallback(async () => {
    setError(null)
    setStep(STEP.INTERROGATE)
    setBusy(true)
    try {
      const qResult = await getNextQuestion({
        beneficiary,
        amount: Number(amount),
        conversationHistory: [],
        previousTransfers,
        lang,
      })
      await handleQuestionResult([], qResult)
    } catch (e) {
      setError(humanError(e, t))
    } finally {
      setBusy(false)
    }
  }, [beneficiary, amount, previousTransfers, handleQuestionResult, t, lang])

  // ── Send answer in chat ───────────────────────────────────
  const sendAnswer = useCallback(async () => {
    const text = answer.trim()
    if (!text || busy) return
    const history = [...messages, { role: 'user', content: text }]
    setMessages(history)
    setAnswer('')
    setBusy(true)
    setError(null)
    try {
      const qResult = await getNextQuestion({
        beneficiary,
        amount: Number(amount),
        conversationHistory: history,
        previousTransfers,
        lang,
      })
      await handleQuestionResult(history, qResult)
    } catch (e) {
      setError(humanError(e, t))
    } finally {
      setBusy(false)
    }
  }, [answer, busy, messages, beneficiary, amount, previousTransfers, handleQuestionResult, t, lang])

  // ── Confirm transfer ──────────────────────────────────────
  const confirm = async () => {
    if (committing) return           // guard against double-submit (duplicate tx)
    setCommitting(true)
    try {
      const payload = {
        beneficiary,
        iban,
        amount: Number(amount),
        reason: messages.find((m) => m.role === 'user')?.content || '',
        riskScore: assessment?.riskScore ?? 0,
        riskLevel: assessment?.riskLevel ?? 'low',
      }
      await executeTransfer(payload)
      setResult({ blocked: false })
      setStep(STEP.RESULT)
    } finally {
      setCommitting(false)
    }
  }

  // ── Block transfer ────────────────────────────────────────
  const block = async () => {
    if (committing) return
    setCommitting(true)
    try {
      const payload = {
        beneficiary,
        iban,
        amount: Number(amount),
        reason: messages.find((m) => m.role === 'user')?.content || '',
        reasoning: assessment?.reasoning || (assessment?.redFlags && assessment.redFlags[0]) || '',
        riskScore: assessment?.riskScore ?? 0,
        riskLevel: assessment?.riskLevel ?? 'low',
      }
      await blockTransfer(payload)
      setResult({ blocked: true })
      setStep(STEP.RESULT)
    } finally {
      setCommitting(false)
    }
  }

  // ── Key handler for chat input ────────────────────────────
  const onAnswerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendAnswer()
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────
  const stepTitles = [
    t('chooseBeneficiary'),
    t('transferDetails'),
    t('intentReview'),
    t('riskAssessment'),
    '',
  ]

  return (
    <div className="transfer-page page-scroll" ref={scrollRef}>
      {/* ── Header ── */}
      <div className="transfer-header">
        <h1 className="transfer-h1">{t('transfer')}</h1>
        <div className="transfer-steps" role="progressbar" aria-valuenow={step} aria-valuemin={0} aria-valuemax={4}>
          {[0, 1, 2, 3, 4].map((s) => (
            <div key={s} className={`transfer-step-dot${s <= step ? ' active' : ''}`} />
          ))}
        </div>
        {stepTitles[step] ? (
          <p className="transfer-h2">{stepTitles[step]}</p>
        ) : null}
      </div>

      {/* ── STEP 0: Pick beneficiary ── */}
      {step === STEP.PICK && (
        <div>
          {/* Search */}
          <div className="transfer-search-wrap">
            <Search size={18} color="var(--text-muted)" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchBeneficiary')}
              aria-label={t('searchBeneficiary')}
            />
          </div>

          {error && (
            <div className="transfer-error">
              <ErrorBox message={error} onRetry={() => setError(null)} />
            </div>
          )}

          <p className="transfer-list-label">{t('activeBeneficiaries')}</p>

          {filteredBeneficiaries.length === 0 ? (
            <div className="transfer-pick-empty">
              <Users size={28} color="var(--text-hint)" aria-hidden="true" />
              <span>{t('noActiveBenHint')}</span>
            </div>
          ) : (
            <div className="transfer-ben-list">
              {filteredBeneficiaries.map((b) => (
                <BeneficiaryRow
                  key={b.id}
                  b={b}
                  t={t}
                  isRTL={isRTL}
                  onPress={() => pickBeneficiary(b)}
                />
              ))}
            </div>
          )}

          <button
            className="transfer-add-new-btn"
            onClick={() => setAddModal(true)}
            aria-label={t('addNewBeneficiary')}
          >
            <Plus size={18} aria-hidden="true" />
            {t('addNewBeneficiary')}
          </button>
        </div>
      )}

      {/* ── STEP 1: Enter amount ── */}
      {step === STEP.AMOUNT && (
        <div>
          {/* Back to beneficiary picker */}
          <button
            className="transfer-change-ben"
            onClick={() => setStep(STEP.PICK)}
            aria-label={t('chooseBeneficiary')}
          >
            {isRTL
              ? <ArrowRight size={16} color="var(--gold)" aria-hidden="true" />
              : <ArrowLeft  size={16} color="var(--gold)" aria-hidden="true" />
            }
            <User size={15} color="var(--gold)" aria-hidden="true" />
            <span>{beneficiary}</span>
          </button>

          {/* Amount field */}
          <div className="transfer-field">
            <label className="transfer-field-label" htmlFor="transfer-amount">
              {t('amount')} ({t('currency')})
            </label>
            <div className="transfer-field-wrap">
              <DollarSign size={18} color="var(--text-muted)" aria-hidden="true" />
              <input
                id="transfer-amount"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                placeholder="0.00"
                aria-describedby={Number(amount) > balance ? 'amount-warn' : undefined}
              />
            </div>
          </div>

          {Number(amount) > balance && (
            <p className="transfer-warn-text" id="amount-warn" role="alert">
              {t('balance')}: {formatMoney(balance)} <RiyalSymbol size="0.8em" />
            </p>
          )}

          <button
            className="transfer-primary-btn"
            disabled={!validAmount}
            onClick={startInterrogation}
          >
            {t('proceed')}
            {isRTL
              ? <ArrowLeft  size={18} aria-hidden="true" />
              : <ArrowRight size={18} aria-hidden="true" />
            }
          </button>
        </div>
      )}

      {/* ── STEP 2: Interrogation chat ── */}
      {step === STEP.INTERROGATE && (
        <div>
          <GuardianHeader t={t} title={t('reviewingTitle')} subtitle={t('reviewingSubtitle')} />
          <SummaryChip beneficiary={beneficiary} amount={amount} formatMoney={formatMoney} t={t} />

          <div className="transfer-chat-body" aria-live="polite" aria-label={t('intentReview')}>
            {messages.map((m, i) => (
              <ChatLine key={i} role={m.role} content={m.content} />
            ))}

            {busy && (
              <div className="transfer-ai-typing">
                <TypingDots />
              </div>
            )}

            {error && (
              <div className="transfer-error">
                <ErrorBox message={error} onRetry={() => setError(null)} />
              </div>
            )}

            {/* Invisible anchor to scroll to bottom */}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {/* ── STEP 3: Risk assessment ── */}
      {step === STEP.ASSESS && (
        <div>
          <SummaryChip beneficiary={beneficiary} amount={amount} formatMoney={formatMoney} t={t} />

          {busy || !assessment ? (
            <div className="transfer-assess-loading" role="status" aria-label={t('analyzing')}>
              <GuardianHeader t={t} title={t('analyzingTransfer')} subtitle={t('analyzing')} analyzing />
              <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
              {error && (
                <div className="transfer-error">
                  <ErrorBox message={error} />
                </div>
              )}
            </div>
          ) : assessment.approved ? (
            <ApprovedView kind={assessment.approvalKind} reasonKey={assessment.reasonKey} t={t} onConfirm={confirm} busy={committing} />
          ) : assessment.isPersonallyKnown ? (
            <KnownPersonView t={t} onConfirm={confirm} busy={committing} />
          ) : (
            <AssessmentView
              assessment={assessment}
              t={t}
              isRTL={isRTL}
              onConfirm={confirm}
              onBlock={block}
              busy={committing}
            />
          )}
        </div>
      )}

      {/* ── STEP 4: Result ── */}
      {step === STEP.RESULT && (
        <ResultView
          blocked={result?.blocked}
          balance={balance}
          formatMoney={formatMoney}
          t={t}
          onDone={() => {
            resetFlow()
            navigate('/app/home')
          }}
          onAnother={resetFlow}
        />
      )}

      {/* ── Fixed chat input bar (INTERROGATE step only) ── */}
      {step === STEP.INTERROGATE && (
        <div className="transfer-input-bar">
          <input
            ref={answerRef}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={onAnswerKeyDown}
            placeholder={t('typeAnswer')}
            disabled={busy}
            aria-label={t('typeAnswer')}
          />
          <button
            className="transfer-send-btn"
            onClick={sendAnswer}
            disabled={!answer.trim() || busy}
            aria-label={t('send')}
          >
            <Send size={18} color="var(--bg)" aria-hidden="true" style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }} />
          </button>
        </div>
      )}

      {/* ── Add beneficiary modal ── */}
      <AddBeneficiaryModal visible={addModal} onClose={() => setAddModal(false)} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────

function BeneficiaryRow({ b, t, isRTL, onPress }) {
  const meta = b.transferCount
    ? `×${b.transferCount} ${t('benTransfers')}`
    : t('benNew')

  return (
    <button
      className="transfer-ben-row"
      onClick={onPress}
      aria-label={`${b.name} — ${meta}`}
    >
      <div className="transfer-ben-avatar">
        <User size={18} color="var(--teal)" aria-hidden="true" />
      </div>
      <div className="transfer-ben-info">
        <div className="transfer-ben-name">{b.name}</div>
        <div className="transfer-ben-meta">{meta}</div>
      </div>
      {isRTL
        ? <ChevronLeft size={20} color="var(--text-muted)" aria-hidden="true" />
        : <ChevronRight size={20} color="var(--text-muted)" aria-hidden="true" />
      }
    </button>
  )
}

function SummaryChip({ beneficiary, amount, formatMoney, t }) {
  return (
    <div className="transfer-summary">
      <User size={15} color="var(--gold)" aria-hidden="true" />
      <span className="transfer-summary-text">{beneficiary}</span>
      <span className="transfer-summary-divider" aria-hidden="true" />
      <span className="transfer-summary-amount">
        {formatMoney(Number(amount))} <RiyalSymbol size="0.8em" />
      </span>
    </div>
  )
}

// Named guardian persona so the interrogation reads as a security review,
// not a generic chat.
function GuardianHeader({ t, title, subtitle, analyzing = false }) {
  return (
    <div className={`transfer-guardian${analyzing ? ' analyzing' : ''}`}>
      <span className="transfer-guardian-avatar" aria-hidden="true">
        <ShieldCheck size={20} color="var(--gold)" />
      </span>
      <div className="transfer-guardian-text">
        <span className="transfer-guardian-title">{title}</span>
        <span className="transfer-guardian-sub">{subtitle}</span>
      </div>
    </div>
  )
}

function ChatLine({ role, content }) {
  const isAI = role === 'assistant'
  if (isAI) {
    return (
      <div className="transfer-chat-row ai">
        <span className="transfer-chat-avatar" aria-hidden="true">
          <ShieldCheck size={15} color="var(--gold)" />
        </span>
        <div className="transfer-chat-line ai">{content}</div>
      </div>
    )
  }
  return <div className="transfer-chat-line user">{content}</div>
}

function AssessmentView({ assessment, t, isRTL, onConfirm, onBlock, busy }) {
  const band  = riskBand(assessment.riskScore)
  const color = band.color
  const label = t(band.key)
  const safe  = assessment.recommendation === 'allow'

  return (
    <div>
      {/* Gauge */}
      <div className="transfer-meter-wrap">
        <RiskMeter score={assessment.riskScore} label={t('riskScore')} />
        <div
          className="transfer-level-pill"
          style={{ backgroundColor: `${color}22`, borderColor: color, color }}
          role="status"
          aria-label={label}
        >
          {label}
        </div>
      </div>

      {/* Predictions */}
      {assessment.predictions && assessment.predictions.length > 0 && (
        <div className="transfer-assess-block">
          <p className="transfer-block-title">{t('predictions')}</p>
          {assessment.predictions.map((p, i) => (
            <ListLine key={i} text={p} icon={<AlertTriangle size={16} color="var(--warning)" aria-hidden="true" />} />
          ))}
        </div>
      )}

      {/* Red flags */}
      {assessment.redFlags && assessment.redFlags.length > 0 && (
        <div className="transfer-assess-block">
          <p className="transfer-block-title">{t('redFlags')}</p>
          {assessment.redFlags.map((p, i) => (
            <ListLine key={i} text={p} icon={<X size={16} color="var(--danger)" aria-hidden="true" />} />
          ))}
        </div>
      )}

      {/* AI reasoning */}
      {assessment.reasoning ? (
        <div className="transfer-reason-box">
          <p className="transfer-block-title">{t('aiReasoning')}</p>
          <p className="transfer-reason-text">{assessment.reasoning}</p>
        </div>
      ) : null}

      {/* Actions */}
      {safe ? (
        <button className="transfer-safe-btn" onClick={onConfirm} disabled={busy}>
          {busy ? <span className="spinner" /> : <CheckCircle2 size={18} aria-hidden="true" />}
          {t('safeTransfer')} · {t('confirmTransfer')}
        </button>
      ) : (
        <div className="transfer-risky-actions">
          <button className="transfer-block-btn" onClick={onBlock} disabled={busy}>
            <Shield size={18} aria-hidden="true" />
            {t('cancelTransfer')}
          </button>
          <button className="transfer-risky-btn" onClick={onConfirm} disabled={busy}>
            {t('confirmDespiteRisk')}
          </button>
        </div>
      )}
    </div>
  )
}

function KnownPersonView({ t, onConfirm, busy }) {
  return (
    <div className="transfer-known-wrap">
      <div className="transfer-known-icon success">
        <CheckCircle2 size={48} color="var(--success)" aria-hidden="true" />
      </div>
      <p className="transfer-known-title">{t('safeKnownPerson')}</p>
      <button className="transfer-safe-btn" style={{ width: '100%' }} onClick={onConfirm} disabled={busy}>
        {busy ? <span className="spinner" /> : <CheckCircle2 size={18} aria-hidden="true" />}
        {t('confirmTransfer')}
      </button>
    </div>
  )
}

function ApprovedView({ kind, reasonKey, t, onConfirm, busy }) {
  const title = kind === 'guarantee' ? t('verifiedInvoice') : t('approvedTitle')
  const skipSubtitleKey =
    reasonKey === 'knownBeneficiary' ? 'reasonKnownBeneficiary'
    : reasonKey === 'knownService' ? 'approvedKnownService'
    : 'approvedLowAmount'
  const subtitle = kind === 'skip' ? t(skipSubtitleKey) : ''

  return (
    <div className="transfer-known-wrap">
      <div className="transfer-known-icon teal">
        <CheckCircle2 size={48} color="var(--teal)" aria-hidden="true" />
      </div>
      <p className="transfer-known-title">{title}</p>
      {subtitle ? (
        <p className="transfer-approved-subtitle">{subtitle}</p>
      ) : null}
      <button className="transfer-safe-btn teal" style={{ width: '100%' }} onClick={onConfirm} disabled={busy}>
        {busy ? <span className="spinner" /> : <CheckCircle2 size={18} aria-hidden="true" />}
        {t('confirmTransfer')}
      </button>
    </div>
  )
}

function ListLine({ text, icon }) {
  return (
    <div className="transfer-list-line">
      <span style={{ flexShrink: 0, marginBlockStart: 2 }}>{icon}</span>
      <span className="transfer-list-text">{text}</span>
    </div>
  )
}

function ResultView({ blocked, balance, formatMoney, t, onDone, onAnother }) {
  const color = blocked ? 'var(--danger)' : 'var(--success)'

  return (
    <div className="transfer-result">
      <div
        className="transfer-result-icon"
        style={{ background: blocked ? 'rgba(217,48,37,0.13)' : 'rgba(26,127,90,0.13)' }}
      >
        {blocked
          ? <Shield size={42} color={color} aria-hidden="true" />
          : <Check  size={42} color={color} aria-hidden="true" />
        }
      </div>

      <p className="transfer-result-title" role="status">
        {blocked ? t('transferBlocked') : t('transferSuccess')}
      </p>

      {!blocked && (
        <div className="transfer-result-balance">
          <span className="transfer-result-balance-label">{t('newBalance')}</span>
          <span className="transfer-result-balance-value">
            {formatMoney(balance)} <RiyalSymbol size="0.8em" />
          </span>
        </div>
      )}

      <button className="transfer-primary-btn" onClick={onDone}>
        {t('backToHome')}
      </button>

      <button className="transfer-another-link" onClick={onAnother}>
        {t('transfer')}
      </button>
    </div>
  )
}
