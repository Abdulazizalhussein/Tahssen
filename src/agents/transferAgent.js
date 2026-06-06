// ─────────────────────────────────────────────────────────────────
//  TAHSEEN — Adaptive Transfer Intelligence v7
//  AI-driven conversation manager. Smart, not rigid.
// ─────────────────────────────────────────────────────────────────

import { proxyInterrogate } from './proxyClient'

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

export async function getNextQuestion(_apiKey, { beneficiary, amount, conversationHistory, previousTransfers }) {
  const allAnswers = conversationHistory.filter((m) => m.role === 'user').map((m) => m.content).join(' ')
  const qCount = conversationHistory.filter((m) => m.role === 'assistant').length
  const bType = classifyBeneficiary(beneficiary || '')

  // ── 1. INSTANT APPROVE: prior relationship ─────────────────────
  if (previousTransfers?.length > 0) {
    return { done: true, skipRisk: true, riskScore: 5,
      reason: `مستفيد سبق التحويل إليه (${previousTransfers.length} مرة)` }
  }

  // ── 2. INSTANT SIGNALS (after ≥1 answer) ──────────────────────
  if (qCount >= 1) {
    if (hit(allAnswers, KNOWN_PERSON_SIGNALS))
      return { done: true, isPersonallyKnown: true }

    if (hit(allAnswers, CRYPTO_FRAUD))
      return { done: true, forceHighRisk: true, riskScore: 97,
        reason: 'وعود استثمار أو عملات رقمية — احتيال شائع' }

    if (hit(allAnswers, SOCIAL_STRANGERS) && amount > 300)
      return { done: true, forceHighRisk: true, riskScore: 88,
        reason: 'شخص تعرفت عليه عبر وسائل التواصل الاجتماعي' }
  }

  // ── 3. TINY AMOUNT ─────────────────────────────────────────────
  if (amount < 300) {
    if (qCount === 0) return { done: false, question: 'ما سبب هذه الحوالة؟' }
    return { done: true, skipRisk: true, riskScore: 10, reason: 'مبلغ بسيط' }
  }

  // ── 4. HARD LIMIT ──────────────────────────────────────────────
  if (qCount >= 4) return { done: true }

  // ── 5. Q1: always purpose ──────────────────────────────────────
  if (qCount === 0) return { done: false, question: 'ما سبب هذه الحوالة؟' }

  // ── 6. Q2-Q4: AI-managed conversation (via proxy) ─────────────
  try {
    return await proxyInterrogate({ beneficiary, amount, conversationHistory, previousTransfers })
  } catch {
    return { done: true } // fallback to full analysis on network error
  }
}
