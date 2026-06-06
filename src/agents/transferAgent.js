// ─────────────────────────────────────────────
//  TAHSEEN — Transfer Intelligence Engine v5
//  Decision tree: never rush to judgment
// ─────────────────────────────────────────────

// ── Classifier lists ──────────────────────────
const INSTITUTION_SIGNALS = [
  'شركة','مؤسسة','مجموعة','مطعم','صيدلية','بقالة','سوبرماركت','محل','متجر',
  'مدرسة','جامعة','مستشفى','عيادة','مكتب','شركه','ltd','co.','corp','inc',
  'llc','ذ.م.م','company','group','store','shop','restaurant','pharmacy',
  'stc','zain','mobily','jawwy','sadad','mada','وزارة','هيئة','بلدية','أمانة',
  'aramco','sabic','saudia','flyadeal','flynas','نقل','شحن','delivery','توصيل'
]

const PHYSICAL_STORE_SIGNALS = [
  'زرت','زيارة','ذهبت','كنت فيه','موجود','قريب','شارع','حي','مجمع','مول',
  'ايكيا','ikea','بن داود','panda','أسواق','carrefour','lulu','danube','دانوب',
  'extra','اكسترا','jarir','جرير','فتحالله','othaim','العثيم','nesto','نستو'
]

const ONLINE_UNVERIFIED_SIGNALS = [
  'تويتر','سناب','snapchat','انستا','instagram','تيك توك','tiktok',
  'واتساب','whatsapp','سوشيال','شخص من النت','من الانترنت','من المجموعة',
  'موقع غير معروف','تطبيق','app جديد','عرض خاص','حصري'
]

const CRYPTO_INVESTMENT_SIGNALS = [
  'كريبتو','بيتكوين','bitcoin','crypto','usdt','binance','bybit','okx',
  'عملة رقمية','تداول','ربح','استثمار','عائد','return','profit','forex',
  'مضاعفة','ضاعف','مضاعفه','ارباح سريعة','ضمان ربح','مضمون'
]

const KNOWN_SAFE_SERVICES = [
  'كهرباء','ماء','غاز','إيجار','اشتراك','راتب','أجور','تأمين',
  'نتفليكس','netflix','spotify','سبوتيفاي','anghami','انغامي',
  'amazon','أمازون','noon','نون','namshi','jarir','جرير',
  'hungerstation','جاهز','marsool','مرسول','toters','careem','كريم',
  'saudi post','بريد','dhl','aramex','smsa','سمسا'
]

const GUARANTEE_SIGNALS = [
  'فاتورة','رقم طلب','invoice','receipt','order','رقم الطلب',
  'رمز التحقق','tracking','تتبع','رقم المعاملة','عقد','ايصال','وصل'
]

const URGENCY_SIGNALS = [
  'لازم الحين','الآن فقط','العرض ينتهي','سريع','ضروري الحين',
  'أخر فرصة','now or never','مستعجل','urgent','asap'
]

// ── Classifier functions ───────────────────────
function classify(text, list) {
  const lower = (text || '').toLowerCase()
  return list.some((s) => lower.includes(s))
}

function classifyBeneficiary(name) {
  if (classify(name, INSTITUTION_SIGNALS)) return 'institution'
  // Arabic names typically have 2-4 words, all looking like personal names
  const words = name.trim().split(/\s+/)
  if (words.length >= 2 && words.length <= 4) return 'individual'
  return 'unknown'
}

// ── Main decision function ─────────────────────
export async function getNextQuestion(apiKey, { beneficiary, amount, conversationHistory = [] }) {
  const userAnswers = conversationHistory.filter((m) => m.role === 'user').map((m) => m.content).join(' ')
  const qCount = conversationHistory.filter((m) => m.role === 'assistant').length
  const beneficiaryType = classifyBeneficiary(beneficiary || '')

  // ── After collecting answers: evaluate ──────
  if (qCount >= 1) {
    const reason = conversationHistory.find((m) => m.role === 'user')?.content || ''

    // INSTANT FLAG: crypto/investment fraud
    if (classify(userAnswers, CRYPTO_INVESTMENT_SIGNALS)) {
      return { done: true, forceHighRisk: true, riskScore: 97,
        reason: 'مؤشر احتيال: ادعاءات ربح أو عملات رقمية' }
    }

    // INSTANT FLAG: social media stranger + meaningful amount
    if (classify(userAnswers, ONLINE_UNVERIFIED_SIGNALS) && amount > 500) {
      return { done: true, forceHighRisk: true, riskScore: 85,
        reason: 'مؤشر احتيال: طلب عبر وسائل التواصل بدون ضمان' }
    }

    // INSTANT APPROVE: known safe service or physical store
    if (classify(userAnswers, KNOWN_SAFE_SERVICES)) {
      return { done: true, skipRisk: true, riskScore: 8, reason: 'خدمة معروفة وموثوقة' }
    }
    if (classify(userAnswers, PHYSICAL_STORE_SIGNALS)) {
      return { done: true, skipRisk: true, riskScore: 12, reason: 'محل حضوري — بإمكانك الرجوع إليه' }
    }

    // INSTANT APPROVE: has guarantee
    if (classify(userAnswers, GUARANTEE_SIGNALS)) {
      return { done: true, hasGuarantee: true }
    }

    // INSTANT APPROVE: institution beneficiary + any reason given
    if (beneficiaryType === 'institution' && reason.length > 5) {
      return { done: true, skipRisk: true, riskScore: 15, reason: 'جهة مؤسسية مع سبب واضح' }
    }
  }

  // ── Small amount: ask purpose once then proceed ─
  if (amount < 300) {
    if (qCount === 0) return { done: false, question: 'ما سبب هذه التحويلة؟' }
    return { done: true, skipRisk: true, riskScore: 10, reason: 'مبلغ بسيط' }
  }

  // ── Max 3 questions ─────────────────────────
  if (qCount >= 3) return { done: true }

  // ── Q1: Always ask purpose first ────────────
  if (qCount === 0) {
    return { done: false, question: 'ما سبب هذه التحويلة؟' }
  }

  // ── Q2: Depends on first answer + context ────
  if (qCount === 1) {
    const firstAnswer = conversationHistory.filter((m) => m.role === 'user')[0]?.content || ''

    // If beneficiary is individual and amount is high → ask about guarantee
    if (beneficiaryType === 'individual' && amount > 1000 &&
        !classify(firstAnswer, GUARANTEE_SIGNALS)) {
      return { done: false, question: 'هل تملك فاتورة أو شيء يحفظ حقك مع هذا الشخص؟' }
    }

    // If mentioned online or store but unclear physical/online
    if (!classify(firstAnswer, PHYSICAL_STORE_SIGNALS) &&
        (firstAnswer.includes('محل') || firstAnswer.includes('متجر') ||
         firstAnswer.includes('موقع') || firstAnswer.includes('تطبيق'))) {
      return { done: false, question: 'هل هذا المحل حضوري تزوره شخصياً أم متجر إلكتروني؟' }
    }

    // Amount > 5000 + individual + no clear context → who is this person
    if (beneficiaryType === 'individual' && amount > 5000 && firstAnswer.length < 25) {
      return { done: false, question: 'ما طبيعة معرفتك بهذا الشخص؟' }
    }

    // Urgency signals
    if (classify(firstAnswer, URGENCY_SIGNALS)) {
      return { done: false, question: 'من طلب منك هذه التحويلة، وهل تشعر بأي ضغط للإسراع؟' }
    }
  }

  // ── Q3: Final clarification if still ambiguous ─
  if (qCount === 2) {
    if (!classify(userAnswers, GUARANTEE_SIGNALS) && amount > 2000) {
      return { done: false, question: 'هل تملك أي وثيقة أو ضمان يحفظ حقك في هذه المعاملة؟' }
    }
  }

  return { done: true }
}
