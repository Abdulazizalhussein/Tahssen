import { getClient, MODEL } from './llm.js'

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

function stripFences(str) {
  return (str || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

// ── Main export ───────────────────────────────────────────────────

export async function interrogate({ beneficiary, amount, conversationHistory = [], previousTransfers = [] }) {
  const allAnswers = conversationHistory.filter((m) => m.role === 'user').map((m) => m.content).join(' ')
  const qCount     = conversationHistory.filter((m) => m.role === 'assistant').length
  const bType      = classifyBeneficiary(beneficiary || '')

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

  // ── 6. Q2-Q4: AI-managed conversation ─────────────────────────
  const client = getClient()

  const systemPrompt = `أنت وكيل حماية مالية في تطبيق تحصين. مهمتك: طرح سؤال مستهدف واحد أو إصدار حكم نهائي.

## معايير الحكم الفوري

✅ أصدر APPROVE مباشرة إذا:
- المستفيد شخص معروف (عائلة، صديق، زميل، عامل منزلي، جار)
- محل أو شركة معروفة (أمازون، نون، جرير، مطاعم، صيدليات، إلخ)
- يوجد فاتورة، رقم طلب، أو عقد موثق
- مبلغ صغير مع أي توضيح منطقي
- منصة دفع موثوقة

⛔ أصدر BLOCK مباشرة إذا:
- أي ذكر لكريبتو / بيتكوين / usdt / فوركس مع وعود ربح
- "اشتر بطاقات وأرسل الأرقام" (iTunes, Google Play, إلخ)
- شخص من سناب/انستا/تيك توك/واتساب يطلب مال
- وعود بأرباح مضمونة أو مضاعفة أموال
- فاتورة من جهة مجهولة مع ضغط للدفع فوراً
- "حول المبلغ لشخص آخر" بدلاً من الجهة الأصلية

⚠️ اطرح سؤالاً واحداً إذا:
- الصورة ليست واضحة بعد ويوجد سؤال محدد يحسم الأمر

## قواعد الأسئلة (مهمة جداً)

1. لا تكرر سؤالاً طُرح بالفعل في المحادثة
2. كل سؤال يجب أن يكشف معلومة مختلفة عما سبق
3. الأسئلة قصيرة ومباشرة — لا تشرح، فقط اسأل
4. أولوية الأسئلة:
   - Q2: "هل تعرف هذا الشخص شخصياً؟" (إذا المستفيد فرد مجهول)
   - Q3: "هل عندك فاتورة أو إيصال؟" (إذا لم تُذكر)
   - Q4: فقط إذا كانت هناك علامة تحذيرية لم تتضح بعد
5. حجم المبلغ وحده ليس مبرراً للسؤال — 50,000 ريال لجهة معروفة لا تحتاج سؤالاً

أجب بـ JSON فقط (بدون أي نص إضافي):
{
  "action": "ask" | "approve" | "block" | "analyze",
  "question": "<السؤال إن كان action=ask — جملة قصيرة>",
  "reason": "<سبب القرار — جملة واحدة>",
  "riskScore": <0-100>
}`

  const userMessage = `الحوالة:
- المستفيد: "${beneficiary}" (${bType === 'institution' ? 'مؤسسة/شركة' : bType === 'individual' ? 'شخص فرد' : 'غير محدد'})
- المبلغ: ${amount} ر.س
- الأسئلة المطروحة: ${qCount} من 4

المحادثة حتى الآن:
${conversationHistory.map((m) => `${m.role === 'assistant' ? '[تحصين]' : '[المستخدم]'} ${m.content}`).join('\n')}

هل الصورة واضحة؟ أم تحتاج سؤالاً واحداً لتحسمها؟`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 250,
      })
      const result = JSON.parse(stripFences(response.choices[0].message.content))

      switch (result.action) {
        case 'ask':
          return { done: false, question: result.question || 'هل تملك ما يثبت هذه المعاملة؟' }
        case 'approve':
          return { done: true, skipRisk: true,
            riskScore: Math.min(Math.max(Number(result.riskScore) || 20, 0), 30),
            reason: result.reason }
        case 'block':
          return { done: true, forceHighRisk: true,
            riskScore: Math.min(Math.max(Number(result.riskScore) || 90, 80), 100),
            reason: result.reason }
        case 'analyze':
        default:
          return { done: true }
      }
    } catch {
      if (attempt === 1) break
    }
  }

  return { done: true }
}
