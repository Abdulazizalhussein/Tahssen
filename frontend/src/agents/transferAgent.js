// ─────────────────────────────────────────────────────────────────
//  TAHSEEN — Adaptive Transfer Intelligence v7
//  AI-driven conversation manager. Smart, not rigid.
// ─────────────────────────────────────────────────────────────────

import { apiInterrogate } from '../api/client'
import { STRINGS } from '../i18n'

// Localize an instant-signal string by key, falling back to Arabic then the key.
const L = (lang, key) => STRINGS[lang]?.[key] ?? STRINGS.ar?.[key] ?? key

// ── Instant-signal lists (no AI needed for these) ────────────────

const KNOWN_PERSON_SIGNALS = [
  'ابوي','أبوي','ابي','أبي','والدي','امي','أمي','والدتي','ماما','بابا',
  'أخوي','اخوي','أخي','اخي','أختي','اختي','أخواتي','اخواتي',
  'عمي','خالي','عمتي','خالتي','جدي','جدتي',
  'ابن عمي','ابن خالي','بنت عمي','بنت خالي',
  'قريبي','قريبتي','من أهلي','من اهلي','أهلي','اهلي','عيلتي','عائلتي',
  'زوجتي','زوجي','مرتي','ولدي','بنتي','أبنائي','اولادي',
  'صديقي','صديقتي','صاحبي','صاحبتي','رفيقي','خلّي',
  'زميلي','زميلتي','زميل عمل','زميل دراسة',
  'عاملتي','عاملي','شغالتي','شغالي','سائقي','سائقتي',
  'عاملة المنزل','عاملة منزلية','خادمتي',
  'جاري','جارتي','جيراني',
  'أعرفه','أعرفها','اعرفه','اعرفها','معروف عندي','أثق به','أثق بها',
  'لأخي','لاخي','لأختي','لاختي','لأبوي','لابوي','لأمي','لامي',
  'لصديقي','لصاحبي','لزميلي','للعاملة','للسائق','لقريبي',
  'لولدي','لبنتي','لزوجتي','لزوجي','لعمي','لخالي',
  'هو أخوي','هو أخي','هي أختي','هو صديقي','هي صديقتي',
]

const CRYPTO_FRAUD = [
  'كريبتو','بيتكوين','bitcoin','crypto','usdt','binance','bybit',
  'عملة رقمية','تداول عملات','فوركس','forex',
  'ربح سريع','ربح ضمان','استثمار مضمون','مضاعفة الأموال',
  'عائد يومي','أرباح يومية','passive income','دخل سلبي',
  'استثمار وضمان','ضاعف أموالك',
]

const SOCIAL_STRANGERS = [
  'سناب','snapchat','انستا','instagram','تيك توك','tiktok',
  'من واتساب جماعة','من قروب','من مجموعة',
  'شخص تواصل معي','تواصل معي','راسلني','أرسل لي رابط',
  'شخص من النت','من الانترنت','من السوشيال',
]

// Gift-card / voucher scams — small amounts, so never gate behind a threshold.
const GIFT_CARD_FRAUD = [
  'ايتونز','آيتونز','اي تونز','itunes','قوقل بلاي','جوجل بلاي','google play',
  'بطاقة هدية','بطاقات هدايا','بطاقة قوقل','بطاقة جوجل','رصيد بطاقة',
  'ستيم','steam','بلايستيشن','psn','أرسل الأرقام','ارسل الارقام','ارقام البطاقة','ارقام الكروت',
]

// ── Helpers ───────────────────────────────────────────────────────

function hit(text, list) {
  const lower = (text || '').toLowerCase()
  return list.some((s) => lower.includes(s.toLowerCase()))
}

function classifyBeneficiary(name) {
  const institutionWords = [
    'شركة','مؤسسة','مجموعة','مطعم','صيدلية','بقالة','سوبرماركت','محل',
    'مدرسة','جامعة','مستشفى','عيادة','مكتب','شركه',
    'ltd','co.','corp','inc','llc','ذ.م.م','company','group',
    'store','shop','restaurant','pharmacy','bank','مصرف',
    'وزارة','هيئة','بلدية','أمانة','نادي','جمعية',
    'stc','zain','mobily','jawwy','aramco','sabic',
  ]
  const lower = (name || '').toLowerCase()
  if (institutionWords.some((w) => lower.includes(w))) return 'institution'
  const words = (name || '').trim().split(/\s+/)
  if (words.length >= 2 && words.length <= 4) return 'individual'
  return 'unknown'
}

// ── Main export ───────────────────────────────────────────────────

export async function getNextQuestion({ beneficiary, amount, conversationHistory, previousTransfers, lang = 'ar' }) {
  const allAnswers = conversationHistory.filter((m) => m.role === 'user').map((m) => m.content).join(' ')
  const qCount = conversationHistory.filter((m) => m.role === 'assistant').length
  const bType = classifyBeneficiary(beneficiary || '')

  // ── 1. INSTANT APPROVE: prior relationship ─────────────────────
  if (previousTransfers?.length > 0) {
    return { done: true, skipRisk: true, riskScore: 5, reasonKey: 'knownBeneficiary',
      reason: `${L(lang, 'reasonKnownBeneficiary')} (${previousTransfers.length}×)` }
  }

  // ── 2. INSTANT SIGNALS (after ≥1 answer) ──────────────────────
  // Fraud signals first — a family word must not mask a scam narrative.
  if (qCount >= 1) {
    if (hit(allAnswers, GIFT_CARD_FRAUD))
      return { done: true, forceHighRisk: true, riskScore: 96,
        reason: L(lang, 'reasonGiftCard'),
        redFlags: [L(lang, 'flagGiftCard')],
        predictions: [L(lang, 'predGiftCard')] }

    if (hit(allAnswers, CRYPTO_FRAUD))
      return { done: true, forceHighRisk: true, riskScore: 97,
        reason: L(lang, 'reasonCrypto'),
        redFlags: [L(lang, 'flagCrypto')],
        predictions: [L(lang, 'predCrypto')] }

    if (hit(allAnswers, SOCIAL_STRANGERS))
      return { done: true, forceHighRisk: true, riskScore: 88,
        reason: L(lang, 'reasonSocialStranger'),
        redFlags: [L(lang, 'flagSocialStranger')],
        predictions: [L(lang, 'predSocialStranger')] }

    if (hit(allAnswers, KNOWN_PERSON_SIGNALS))
      return { done: true, isPersonallyKnown: true }
  }

  // ── 3. TINY AMOUNT ─────────────────────────────────────────────
  if (amount < 300) {
    if (qCount === 0) return { done: false, question: L(lang, 'qWhyTransfer') }
    return { done: true, skipRisk: true, riskScore: 10, reasonKey: 'lowAmount', reason: L(lang, 'reasonTinyAmount') }
  }

  // ── 4. HARD LIMIT ──────────────────────────────────────────────
  if (qCount >= 4) return { done: true }

  // ── 5. Q1: always purpose ──────────────────────────────────────
  if (qCount === 0) return { done: false, question: L(lang, 'qWhyTransfer') }

  // ── 6. Q2-Q4: AI-managed conversation ─────────────────────────
  try {
    return await apiInterrogate({ beneficiary, amount, conversationHistory, previousTransfers, lang })
  } catch {
    return { done: true } // fallback to full analysis on network error
  }
}
