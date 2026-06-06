// Smart transfer interrogation — deterministic, fewer questions, clear triggers.
// Behaves like a compliance officer: approve the moment there's a solid basis,
// flag immediately on strong fraud signals, otherwise ask at most 1-2 questions.

const KNOWN_SERVICES = [
  'stc', 'stcpay', 'jawwy', 'جوي', 'mada', 'مدى', 'sadad', 'سداد', 'سدد', 'ماء', 'كهرباء',
  'إيجار', 'ايجار', 'زين', 'موبايلي', 'أمازون', 'amazon', 'noon', 'نون', 'جاهز', 'hungerstation',
  'هنقرستيشن', 'جرير', 'اشتراك', 'نتفليكس', 'netflix', 'spotify', 'سبوتيفاي', 'anghami', 'انغامي',
  'معادن', "ma'aden", 'حكومي', 'وزارة', 'فاتورة كهرباء', 'فاتورة ماء', 'تأمين', 'جامعة', 'مدرسة',
]

const CRYPTO_SIGNALS = [
  'كريبتو', 'بيتكوين', 'bitcoin', 'crypto', 'عملة رقمية', 'عمله رقميه', 'usdt', 'binance', 'بايننس',
  'تداول عملات', 'استثمار رقمي', 'ربح سريع',
]

const SOCIAL_SIGNALS = [
  'سناب', 'snapchat', 'انستا', 'instagram', 'انستقرام', 'تيك توك', 'tiktok', 'تويتر', 'twitter',
  'قروب', 'جروب', 'جماعة', 'وسائل التواصل', 'سوشال', 'من النت', 'من الانترنت', 'شخص من النت',
  'تعرفت عليه',
]

const GUARANTEE_SIGNALS = [
  'فاتورة', 'رقم طلب', 'رقم الطلب', 'رقم الفاتورة', 'invoice', 'receipt', 'order', 'رقم المعاملة',
  'تتبع', 'tracking', 'عقد', 'contract', '#', 'رمز التحقق', 'confirmation',
]

const hasMatch = (text, list) => {
  const lower = (text || '').toLowerCase()
  return list.some((s) => lower.includes(s.toLowerCase()))
}

export const isKnownService = (text) => hasMatch(text, KNOWN_SERVICES)
export const isCryptoSignal = (text) => hasMatch(text, CRYPTO_SIGNALS)
export const isSocialMedia = (text) => hasMatch(text, SOCIAL_SIGNALS)
export const hasGuaranteeSignal = (text) => hasMatch(text, GUARANTEE_SIGNALS)

// Returns the SINGLE next question to ask, or a done verdict with flags for the risk engine.
export async function getNextQuestion(apiKey, { beneficiary, amount, conversationHistory = [], previousTransfers = [] }) {
  const amt = Number(amount) || 0
  const userAnswers = conversationHistory.filter((m) => m.role === 'user').map((m) => m.content)
  const qCount = conversationHistory.filter((m) => m.role === 'assistant').length
  const allAnswers = userAnswers.join(' ')
  const firstAnswer = userAnswers[0] || ''

  // ── Instant approve ───────────────────────────────────────────────
  if (amt > 0 && amt < 300) {
    return { done: true, skipRisk: true, riskScore: 8, reasonKey: 'lowAmount' }
  }
  if (hasGuaranteeSignal(allAnswers)) {
    return { done: true, hasGuarantee: true, riskScore: 15 }
  }
  if (isKnownService(allAnswers)) {
    return { done: true, skipRisk: true, riskScore: 12, reasonKey: 'knownService' }
  }

  // ── Instant escalation (after at least one answer) ────────────────
  if (qCount >= 1) {
    if (isCryptoSignal(allAnswers)) {
      return { done: true, forceHighRisk: true, riskScore: 95, reasonKey: 'crypto' }
    }
    if (isSocialMedia(allAnswers) && amt > 1000) {
      return { done: true, forceHighRisk: true, riskScore: 88, reasonKey: 'social' }
    }
  }

  // ── Max questions reached → hand off to risk engine ───────────────
  if (qCount >= 2) return { done: true }

  // ── First question: always the purpose ────────────────────────────
  if (qCount === 0) {
    return {
      done: false,
      question: 'ما هدف هذه التحويلة؟',
      questionEn: 'What is the purpose of this transfer?',
    }
  }

  // ── Second question: only if the first answer leaves a real gap ───
  if (amt > 3000 && !hasGuaranteeSignal(firstAnswer) && firstAnswer.trim().length < 30) {
    return {
      done: false,
      question: 'هل عندك رقم فاتورة أو رقم طلب للتحقق؟',
      questionEn: 'Do you have an invoice or order number to verify?',
    }
  }

  if (isSocialMedia(firstAnswer) && !hasGuaranteeSignal(firstAnswer)) {
    return {
      done: false,
      question: 'من أين جاءك طلب هذه التحويلة؟ (رسالة، مكالمة، تطبيق..)',
      questionEn: 'Where did this transfer request come from? (message, call, app..)',
    }
  }

  // Enough context — proceed to risk scoring.
  return { done: true }
}
