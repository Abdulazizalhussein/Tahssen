// ─────────────────────────────────────────────────────────────────
//  TAHSEEN — Transfer Intelligence v6
//  Known person = instant approve. Unknown/store = smart questions.
// ─────────────────────────────────────────────────────────────────

// ── Known Relationship Signals ────────────────────────────────────
// Any mention of these = the user knows this person personally → approve
const KNOWN_PERSON_SIGNALS = [
  // Parents
  'ابوي','أبوي','ابي','أبي','والدي','ابوه','أبوه',
  'امي','أمي','والدتي','امها','أمها','ماما','بابا',
  // Siblings
  'أخوي','اخوي','أخي','اخي','أختي','اختي','أخواتي',
  // Extended family
  'عمي','خالي','عمتي','خالتي','جدي','جدتي',
  'ابن عمي','ابن خالي','بنت عمي','بنت خالي',
  'عمه','خاله','قريبي','قريبتي','من أهلي','من اهلي',
  'أهلي','اهلي','عيلتي','عائلتي','أقاربي',
  // Spouse/children
  'زوجتي','زوجي','مرتي','ولدي','بنتي','أبنائي','اولادي',
  // Friends
  'صديقي','صديقتي','صاحبي','صاحبتي','رفيقي','رفيقتي',
  'خلّي','خلي','اصحابي','أصحابي',
  // Colleagues
  'زميلي','زميلتي','زميل','زميلة','رسيلي',
  'موظف عندي','موظفة عندي',
  // Employees/workers
  'عاملتي','عاملي','شغالتي','شغالي','سائقي','سائقتي',
  'عاملة المنزل','عاملة منزلية','خادمتي','خادمي',
  'شغّال','شغّالة','طباخي','طباختي',
  // Known person indicators
  'أعرفه','أعرفها','أعرفهم','معرفتي','أعرفه شخصياً',
  'معروف عندي','صاحبي','من معارفي','جاري','جارتي',
  'جيراني','من الحي','زبوني','عميلي',
];

// ── Physical Store Signals ────────────────────────────────────────
const PHYSICAL_STORE_SIGNALS = [
  'زرت','زيارة','ذهبت','مررت','راحت','رحت','رحنا',
  'كنت فيه','موجود','في الشارع','في الحي','قريب',
  'مجمع','مول','سوق','بلازا','سنتر','center','mall',
  'إيكيا','ikea','بن داود','باندا','panda','أسواق العثيم','العثيم',
  'الدانوب','دانوب','danube','لولو','lulu','carrefour','كارفور',
  'أكسترا','extra','جرير','jarir','السوق','محل قريب',
  'عندهم فرع','فيه فروع','أقدر أرجع','بإمكاني الرجوع',
];

// ── Trusted Online Platforms ──────────────────────────────────────
const TRUSTED_ONLINE = [
  'أمازون','amazon','نون','noon','نمشي','namshi',
  'جاهز','hungerstation','مرسول','marsool','طلبات','talabat',
  'كريم','careem','أوبر','uber','نتفليكس','netflix',
  'spotify','سبوتيفاي','anghami','انغامي','osn','بيإن',
  'stcpay','stc pay','مدى','mada','سدد','sadad',
  'تمارا','tamara','تابي','tabby',
];

// ── Known Services ────────────────────────────────────────────────
const KNOWN_SERVICES = [
  'إيجار','ايجار','راتب','أجور','اجور','مصاريف',
  'كهرباء','ماء','غاز','إنترنت','انترنت','تلفون','هاتف',
  'مدرسة','جامعة','رسوم','قسط','تأمين','أقساط',
  'زين','موبايلي','stc','مصرف','بنك','تسوية',
];

// ── Unverified Online Risk Signals ───────────────────────────────
const ONLINE_UNVERIFIED = [
  'موقع ما أعرفه','موقع جديد','تطبيق جديد','تطبيق غير معروف',
  'من النت','من الانترنت','موقع غريب','لقيته أونلاين',
  'عرض من الانترنت','من إعلان','من رابط',
];

// ── Crypto / Investment Fraud ─────────────────────────────────────
const CRYPTO_FRAUD = [
  'كريبتو','بيتكوين','bitcoin','crypto','usdt','binance','bybit',
  'عملة رقمية','تداول عملات','فوركس','forex',
  'ربح سريع','ربح ضمان','استثمار مضمون','مضاعفة',
  'عائد يومي','أرباح يومية','passive income','دخل سلبي',
];

// ── Social Media Strangers ────────────────────────────────────────
const SOCIAL_STRANGERS = [
  'سناب','snapchat','انستا','instagram','تيك توك','tiktok',
  'من واتساب جماعة','من قروب','من تويتر','من مجموعة',
  'شخص تواصل معي','تواصل معي','ارسل لي','راسلني',
  'من السوشيال','من الشبكات الاجتماعية',
];

// ── Urgency / Pressure Signals ────────────────────────────────────
const URGENCY = [
  'لازم الحين','الآن فقط','العرض ينتهي','سريع جداً',
  'ضروري الحين','إلحاح','urgent','asap','last chance',
  'راح تضيع الفرصة','بكره بتندم','لا تأخر',
];

// ── Guarantee Signals ─────────────────────────────────────────────
const GUARANTEE = [
  'فاتورة','رقم طلب','invoice','receipt','order number',
  'رقم الفاتورة','رقم المعاملة','عقد','ايصال','وصل',
  'تتبع','tracking','رمز التحقق','confirmation number',
];

// ── Helper ────────────────────────────────────────────────────────
function hit(text, list) {
  const lower = (text || '').toLowerCase();
  return list.some(s => lower.includes(s.toLowerCase()));
}

function beneficiaryIsInstitution(name) {
  const institutionWords = ['شركة','مؤسسة','مجموعة','مطعم','صيدلية','بقالة',
    'سوبرماركت','محل','متجر','مدرسة','جامعة','مستشفى','عيادة','مكتب',
    'شركه','ltd','co.','corp','inc','llc','ذ.م.م','company','group',
    'store','shop','restaurant','pharmacy','bank','مصرف','وزارة','هيئة'];
  const lower = (name || '').toLowerCase();
  return institutionWords.some(w => lower.includes(w));
}

// ── Main export ───────────────────────────────────────────────────
export async function getNextQuestion(apiKey, { beneficiary, amount, conversationHistory }) {
  const answers = conversationHistory.filter(m => m.role === 'user').map(m => m.content).join(' ');
  const qCount  = conversationHistory.filter(m => m.role === 'assistant').length;
  const isInstitution = beneficiaryIsInstitution(beneficiary || '');

  // ════════════════════════════════════════════
  //  AFTER FIRST ANSWER — classify immediately
  // ════════════════════════════════════════════
  if (qCount >= 1) {

    // ── INSTANT APPROVE: known person ─────────
    if (hit(answers, KNOWN_PERSON_SIGNALS)) {
      return { done: true, isPersonallyKnown: true };
    }

    // ── INSTANT FLAG: crypto/investment fraud ─
    if (hit(answers, CRYPTO_FRAUD)) {
      return { done: true, forceHighRisk: true, riskScore: 97,
        reason: 'مؤشر احتيال: وعود استثمار أو عملات رقمية' };
    }

    // ── INSTANT FLAG: social media stranger ───
    if (hit(answers, SOCIAL_STRANGERS) && amount > 300) {
      return { done: true, forceHighRisk: true, riskScore: 88,
        reason: 'مؤشر احتيال: شخص تعرفت عليه عبر وسائل التواصل' };
    }

    // ── INSTANT FLAG: urgency/pressure ────────
    if (hit(answers, URGENCY) && amount > 1000) {
      return { done: true, forceHighRisk: true, riskScore: 78,
        reason: 'مؤشر ضغط: طلب مستعجل بدون مبرر واضح' };
    }

    // ── INSTANT APPROVE: known service ────────
    if (hit(answers, KNOWN_SERVICES)) {
      return { done: true, skipRisk: true, riskScore: 8, reason: 'خدمة أو التزام معروف' };
    }

    // ── INSTANT APPROVE: trusted online platform
    if (hit(answers, TRUSTED_ONLINE)) {
      return { done: true, skipRisk: true, riskScore: 10, reason: 'منصة إلكترونية موثوقة' };
    }

    // ── INSTANT APPROVE: physical store visit ─
    if (hit(answers, PHYSICAL_STORE_SIGNALS)) {
      return { done: true, skipRisk: true, riskScore: 12,
        reason: 'محل حضوري — بإمكانك الرجوع إليه' };
    }

    // ── INSTANT APPROVE: has guarantee ────────
    if (hit(answers, GUARANTEE)) {
      return { done: true, hasGuarantee: true };
    }

    // ── INSTANT APPROVE: institution + reason ─
    if (isInstitution && answers.trim().length > 5) {
      return { done: true, skipRisk: true, riskScore: 15, reason: 'جهة مؤسسية مع سبب واضح' };
    }
  }

  // ════════════════════════════════════════════
  //  SMALL AMOUNT: ask once then proceed
  // ════════════════════════════════════════════
  if (amount < 300) {
    if (qCount === 0) return { done: false, question: 'ما سبب هذه الحوالة؟' };
    return { done: true, skipRisk: true, riskScore: 10, reason: 'مبلغ بسيط' };
  }

  // ════════════════════════════════════════════
  //  MAX 3 QUESTIONS
  // ════════════════════════════════════════════
  if (qCount >= 3) return { done: true };

  // ════════════════════════════════════════════
  //  Q1: Always purpose first — open question
  // ════════════════════════════════════════════
  if (qCount === 0) {
    return { done: false, question: 'ما سبب هذه الحوالة؟' };
  }

  // ════════════════════════════════════════════
  //  Q2: Smart follow-up based on first answer
  // ════════════════════════════════════════════
  if (qCount === 1) {
    const firstAnswer = (conversationHistory.find(m => m.role === 'user')?.content || '');

    // Mentioned a store but unclear if physical or online
    const mentionedStore = firstAnswer.includes('محل') || firstAnswer.includes('متجر') ||
      firstAnswer.includes('موقع') || firstAnswer.includes('تطبيق') ||
      firstAnswer.includes('شراء') || firstAnswer.includes('اشترى');

    if (mentionedStore && !hit(firstAnswer, PHYSICAL_STORE_SIGNALS) &&
        !hit(firstAnswer, TRUSTED_ONLINE)) {
      return {
        done: false,
        question: 'هل هذا المتجر حضوري تزوره شخصياً، أم تعامل أونلاين فقط؟'
      };
    }

    // Individual + amount > 1000 + no guarantee yet
    if (!isInstitution && amount > 1000 && !hit(firstAnswer, GUARANTEE)) {
      return {
        done: false,
        question: 'هل عندك فاتورة أو رقم طلب أو أي شيء يحفظ حقك في هذه المعاملة؟'
      };
    }

    // High amount + very vague answer + unknown person
    if (amount > 5000 && firstAnswer.trim().length < 20) {
      return {
        done: false,
        question: 'ما طبيعة علاقتك بهذا الشخص أو الجهة؟'
      };
    }
  }

  // ════════════════════════════════════════════
  //  Q3: Last resort — only if still high risk
  // ════════════════════════════════════════════
  if (qCount === 2 && amount > 3000 && !hit(answers, GUARANTEE)) {
    return {
      done: false,
      question: 'هل تملك أي وثيقة أو ضمان يحفظ حقك؟'
    };
  }

  return { done: true };
}
