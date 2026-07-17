// ─────────────────────────────────────────────────────────────────
//  App-knowledge base + intent router for the in-app assistant.
//  PURE (no framework/Vite imports) so it powers BOTH:
//    1. the chat RAG prompt  → appKnowledge(lang)
//    2. the client intent router → detectIntent(text, lang)
//  and stays unit-testable in isolation (see scripts/review-services.mjs).
// ─────────────────────────────────────────────────────────────────

/** Arabic-aware normalization for fuzzy keyword matching. */
function norm(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .replace(/[ً-ٟ]/g, '') // diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// The user-facing services the assistant can explain (RAG) and open on request.
// keywords are matched as whole tokens/phrases against the normalized message.
export const SERVICES = [
  {
    id: 'transfer',
    route: '/app/transfer',
    title: { ar: 'تحويل الأموال', en: 'Send money' },
    blurb: {
      ar: 'أرسل مبلغاً لمستفيد. يفحص «تحصين» كل تحويل ضد الاحتيال قبل تنفيذه، ويحذّرك فوراً إذا كانت الجهة مُبلّغاً عنها من المجتمع.',
      en: 'Send an amount to a beneficiary. Tahseen screens every transfer for fraud before it goes out and instantly warns you if the payee was reported by the community.',
    },
    keywords: {
      ar: ['تحويل', 'احول', 'حول', 'ابي احول', 'اريد احول', 'ارسل مبلغ', 'ارسل فلوس', 'حول فلوس', 'حول مبلغ', 'ارسال مبلغ', 'تحويل فلوس', 'ابعث فلوس', 'ادفع لشخص'],
      en: ['transfer', 'send money', 'send funds', 'make a payment', 'wire money', 'pay someone'],
    },
  },
  {
    id: 'beneficiaries',
    route: '/app/beneficiaries',
    title: { ar: 'المستفيدون', en: 'Beneficiaries' },
    blurb: {
      ar: 'أضف مستفيداً جديداً أو راجع مستفيديك. عند الإضافة يتحقق «تحصين» إن كان المستفيد مُبلّغاً عنه في شبكة الاحتيال.',
      en: 'Add a new beneficiary or review your list. On add, Tahseen checks whether the beneficiary appears in the community fraud network.',
    },
    keywords: {
      ar: ['مستفيد', 'اضافه مستفيد', 'اضف مستفيد', 'المستفيدين', 'مستفيدين', 'اضافه شخص'],
      en: ['beneficiary', 'beneficiaries', 'add beneficiary', 'add a payee', 'new payee'],
    },
  },
  {
    id: 'analytics',
    route: '/app/analytics',
    title: { ar: 'التحليلات والتوقعات', en: 'Analytics & forecast' },
    blurb: {
      ar: 'مؤشر صحتك المالية، توقّع رصيد نهاية الشهر، والرسوم البيانية للإنفاق اليومي والشهري وحسب الفئة — كلها تتحدّث مع دخلك ومصاريفك مباشرة.',
      en: 'Your financial-health score, month-end balance forecast, and charts for daily, monthly and by-category spending — all update live with your income and expenses.',
    },
    // Noun/screen-oriented terms only — natural questions like "هل إنفاقي طبيعي؟"
    // or "ما التوقعات؟" should be ANSWERED by the RAG advisor, not hijacked into a
    // navigation card, so generic words (توقع/انفاقي) are intentionally excluded.
    keywords: {
      ar: ['تحليلات', 'التحليلات', 'صفحه التحليلات', 'الصحه الماليه', 'مؤشر الصحه', 'رسوم بيانيه', 'الرسوم البيانيه', 'شارت'],
      en: ['analytics', 'analytics page', 'health score', 'charts', 'open analytics'],
    },
  },
  {
    id: 'recommendations',
    route: '/app/recommendations',
    title: { ar: 'التوصيات الذكية', en: 'Smart recommendations' },
    blurb: {
      ar: 'توصيات عملية لتحسين وضعك المالي، كل واحدة بأثرها المتوقّع بالريال بناءً على دخلك ومصاريفك وتوقّعاتك.',
      en: 'Actionable tips to improve your finances, each with its expected riyal impact based on your income, expenses and forecast.',
    },
    keywords: {
      ar: ['توصيات', 'توصيه', 'نصائح', 'نصيحه', 'اقتراحات', 'كيف اوفر', 'كيف احسن وضعي'],
      en: ['recommendations', 'recommendation', 'advice', 'tips', 'how to save', 'suggestions'],
    },
  },
  {
    id: 'community',
    route: '/app/community',
    title: { ar: 'الحماية المجتمعية', en: 'Community protection' },
    blurb: {
      ar: 'أبلِغ عن جهة احتالت عليك ليُحذَّر منها بقية المستخدمين، واطّلع على شبكة العلاقات المالية لأي جهة مُبلّغ عنها.',
      en: 'Report an account that scammed you so other users are warned, and explore the money-flow network of any reported account.',
    },
    keywords: {
      ar: ['ابلاغ', 'ابلغ', 'ابلغ عن احتيال', 'ابلغ عن', 'سجل بلاغ', 'احتيال', 'نصب', 'شكوى', 'الحمايه المجتمعيه', 'شبكه الاحتيال', 'بلاغ'],
      en: ['report fraud', 'report a scam', 'community protection', 'fraud network', 'file a report'],
    },
  },
  {
    id: 'settings',
    route: '/app/settings',
    title: { ar: 'الإعدادات', en: 'Settings' },
    blurb: {
      ar: 'اضبط دخلك الشهري، مصاريفك الثابتة، الميزانية، واللغة — وهي المدخلات التي تبني عليها التوقعات والتحليلات.',
      en: 'Set your monthly income, fixed expenses, budget and language — the inputs the forecast and analytics are built on.',
    },
    // Explicit settings/edit terms only — a bare "دخلي"/"income" is usually part
    // of a question (answered by RAG), not a request to open the settings screen.
    keywords: {
      ar: ['اعدادات', 'الاعدادات', 'الاعداد', 'مصاريف ثابته', 'المصاريف الثابته', 'تغيير اللغه', 'غير اللغه', 'ضبط الميزانيه', 'عدل دخلي', 'عدل مصاريفي'],
      en: ['settings', 'open settings', 'fixed expenses', 'change language', 'edit income', 'preferences'],
    },
  },
]

export function getService(id) {
  return SERVICES.find((s) => s.id === id) || null
}

// Action/navigation cues that mark the message as a REQUEST ("open …", "take me
// to …", "افتح", "ودّني"). Deliberately excludes verbs that are also service
// nouns (transfer/send/report) so a question like "how much did I transfer" is
// NOT diverted — those requests are caught by verb-led keyword phrases instead.
const ACTION_CUES = [
  // ar
  'افتح', 'افتحي', 'افتحلي', 'ودني', 'وديني', 'روح', 'رحني', 'خذني', 'انقلني', 'نقلني',
  'وريني', 'ورني', 'اعرض', 'اعرضي', 'اظهر', 'سوي', 'سويلي', 'ابي', 'ابغى', 'ابغا', 'اريد',
  'ابدا', 'شغل', 'اذهب', 'عطني', 'حول', 'ارسل', 'ابعث', 'اضف', 'اضيف', 'ابلغ', 'بلغ', 'سجل',
  'غير', 'عدل', 'ضبط',
  // en
  'open', 'go', 'go to', 'take me', 'show', 'show me', 'display', 'i want', 'i need',
  'let me', 'start', 'launch', 'navigate', 'bring up', 'pull up', 'add', 'create',
  'change', 'edit', 'set up',
]

/**
 * Detect which service (if any) the user is asking the assistant to PERFORM.
 * Fires only when the message is action-style — a verb-led keyword phrase, or a
 * service noun accompanied by an action cue — so plain informational questions
 * (which the RAG advisor should answer) are never hijacked into a nav card.
 * Whole-token/phrase matching on the normalized message; phrases weigh more.
 * Returns { service, score } for the best match, or null.
 */
export function detectIntent(text, lang = 'ar') {
  const padded = ` ${norm(text)} `
  if (padded.trim().length < 2) return null

  const hasCue = ACTION_CUES.map(norm).some((c) => c && padded.includes(` ${c} `))

  let best = null
  for (const s of SERVICES) {
    const kws = new Set([...(s.keywords.ar || []), ...(s.keywords.en || [])].map(norm))
    let score = 0
    let phraseHit = false
    for (const kw of kws) {
      if (kw && padded.includes(` ${kw} `)) {
        score += kw.includes(' ') ? 2 : 1
        if (kw.includes(' ')) phraseHit = true
      }
    }
    // A verb-led phrase is itself a request; a bare noun needs an action cue.
    if (score > 0 && (phraseHit || hasCue) && (!best || score > best.score)) best = { service: s, score }
  }
  return best
}

/** Compact catalog of the app's services, injected into the chat prompt (RAG). */
export function appKnowledge(lang = 'ar') {
  const en = lang === 'en'
  return SERVICES.map((s) => `- ${en ? s.title.en : s.title.ar} (${s.route}): ${en ? s.blurb.en : s.blurb.ar}`).join('\n')
}
