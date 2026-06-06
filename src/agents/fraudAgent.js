import { getClient, MODEL } from './client'

const SYSTEM = `You are Tahseen's fraud detection engine for Alinma Bank.
Analyze the proposed transfer and return a structured risk assessment.
Be specific and data-driven. Consider:
- Is this a new beneficiary (never seen in the provided history)?
- Is the amount unusual versus previous transfers and the account profile?
- Does the stated reason and the user's interrogation answers match the transfer profile?
- Are there timing, pattern, or social-engineering red flags?
The "reasoning" field MUST be written in Arabic, a single short sentence. Predictions and
redFlags should be short, specific phrases written in the same language as the user's answers.
Return ONLY valid JSON matching the requested schema.`

export async function analyzeTransfer(apiKey, params) {
  const {
    beneficiary,
    amount,
    reason,
    conversationHistory = [],
    previousTransfers = [],
    currentBalance,
    monthlySpent,
    monthlyBudget,
    isPersonallyKnown = false,
    skipRisk = false,
    hasGuarantee = false,
    forceHighRisk = false,
    reasonKey,
    riskScore: preScore,
  } = params

  // ── Short circuits: a solid basis exists, or a strong fraud signal fired ──
  if (isPersonallyKnown) {
    return base({
      mode: 'known', riskScore: 5, riskLevel: 'low', recommendation: 'allow',
      isPersonallyKnown: true, reasoning: 'المستفيد معروف شخصياً.',
    })
  }
  if (skipRisk) {
    return base({
      mode: 'simpleApprove', riskScore: clamp(preScore ?? 8), riskLevel: 'low',
      recommendation: 'allow', reasonKey,
      reasoning: reasonKey === 'knownService' ? 'خدمة أو جهة معروفة — تم القبول.' : 'مبلغ بسيط — تم القبول مباشرة.',
    })
  }
  if (hasGuarantee) {
    return base({
      mode: 'guarantee', riskScore: clamp(preScore ?? 15), riskLevel: 'low',
      recommendation: 'allow', reasoning: 'تم التحقق — يوجد رقم فاتورة أو طلب مؤكد.',
      predictions: ['مدعوم بضمان موثّق'],
    })
  }
  if (forceHighRisk) {
    const score = clamp(preScore ?? 90)
    return base({
      mode: 'high', riskScore: score, riskLevel: 'critical', recommendation: 'block',
      reasoning: reasonKey === 'crypto'
        ? 'مؤشر احتيال مرتفع: تحويل لشراء عملة رقمية — نمط احتيال شائع.'
        : reasonKey === 'social'
          ? 'مؤشر احتيال مرتفع: المستفيد من وسائل التواصل الاجتماعي.'
          : 'مؤشرات احتيال مرتفعة جداً.',
      redFlags: ['نمط مطابق لعمليات احتيال موثقة'],
      predictions: ['احتمال خسارة المبلغ دون استرجاع'],
    })
  }

  // ── Genuine ambiguity → real AI analysis ──
  const client = getClient(apiKey)
  const allAnswers = conversationHistory.filter((m) => m.role === 'user').map((m) => m.content).join('. ')

  const payload = {
    transfer: { beneficiary, amount: Number(amount), reason: reason || allAnswers },
    statedPurpose: allAnswers || 'لم يُذكر',
    previousTransfersToThisBeneficiary: previousTransfers,
    accountContext: { currentBalance, monthlySpent, monthlyBudget },
    scoringGuidance: {
      base: 20,
      addIf: {
        'amount > 5000': 25,
        'amount > 15000': 20,
        'vague or refused purpose': 20,
        'new beneficiary and amount > 2000': 15,
      },
      subtractIf: { 'invoice/order/contract present': 30 },
      thresholds: { block: '> 65', warn: '> 40', allow: '<= 40' },
    },
    expectedSchema: {
      riskScore: '0-100 integer',
      riskLevel: 'low|medium|high|critical',
      isNewBeneficiary: 'boolean',
      hasPreviousTransfers: 'boolean',
      previousTransferCount: 'integer',
      previousTotalAmount: 'number',
      predictions: 'array of short strings',
      redFlags: 'array of short strings',
      recommendation: 'block|warn|allow',
      reasoning: 'one short sentence in Arabic',
    },
  }

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    max_tokens: 500,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: JSON.stringify(payload) },
    ],
    response_format: { type: 'json_object' },
  })

  const parsed = JSON.parse(response.choices[0].message.content)
  const score = clamp(parsed.riskScore)

  return base({
    mode: 'analyzed',
    riskScore: score,
    riskLevel: parsed.riskLevel || levelFromScore(score),
    recommendation: parsed.recommendation || (score > 65 ? 'block' : score > 40 ? 'warn' : 'allow'),
    reasoning: parsed.reasoning || '',
    isNewBeneficiary: !!parsed.isNewBeneficiary,
    hasPreviousTransfers: !!parsed.hasPreviousTransfers,
    previousTransferCount: Number(parsed.previousTransferCount) || previousTransfers.length,
    previousTotalAmount: Number(parsed.previousTotalAmount) || 0,
    predictions: Array.isArray(parsed.predictions) ? parsed.predictions : [],
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
  })
}

function base(overrides) {
  return {
    mode: 'analyzed',
    riskScore: 0,
    riskLevel: 'low',
    recommendation: 'allow',
    reasoning: '',
    reasonKey: undefined,
    isPersonallyKnown: false,
    isNewBeneficiary: false,
    hasPreviousTransfers: false,
    previousTransferCount: 0,
    previousTotalAmount: 0,
    predictions: [],
    redFlags: [],
    ...overrides,
  }
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))

const levelFromScore = (s) => {
  if (s >= 80) return 'critical'
  if (s >= 60) return 'high'
  if (s >= 35) return 'medium'
  return 'low'
}
