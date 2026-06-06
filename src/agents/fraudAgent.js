import { getClient, MODEL } from './client'

export async function analyzeTransfer(apiKey, params) {
  const { isPersonallyKnown, skipRisk, hasGuarantee, forceHighRisk,
          riskScore: preScore, reason, beneficiary, amount,
          conversationHistory = [], previousTransfers = [], currentBalance } = params

  // ── Short circuits ──────────────────────────
  if (isPersonallyKnown)
    return { riskScore: 5, riskLevel: 'low', recommendation: 'allow',
      reasoning: 'المستفيد معروف شخصياً — لا توجد مخاطر.', redFlags: [], predictions: [] }

  if (skipRisk)
    return { riskScore: preScore || 8, riskLevel: 'low', recommendation: 'allow',
      reasoning: reason || 'معاملة آمنة.', redFlags: [], predictions: [] }

  if (hasGuarantee)
    return { riskScore: 12, riskLevel: 'low', recommendation: 'allow',
      reasoning: 'تم التحقق — يوجد فاتورة أو وثيقة تحفظ حقك.', redFlags: [], predictions: ['مدعوم بضمان موثق'] }

  if (forceHighRisk)
    return { riskScore: preScore || 90, riskLevel: 'critical', recommendation: 'block',
      reasoning: reason || 'مؤشرات احتيال مرتفعة.',
      redFlags: ['نمط احتيال موثق'], predictions: ['هذا النمط مطابق لعمليات احتيال شائعة'] }

  // ── Deep AI analysis for ambiguous cases ────
  const client = getClient(apiKey)
  const allContext = conversationHistory.filter((m) => m.role === 'user').map((m) => m.content).join('. ')
  const prevCount = previousTransfers?.length || 0

  const systemPrompt = `أنت نظام كشف احتيال بنكي متخصص. حلل التحويل بعمق وأجب بـ JSON فقط.

معايير التقييم:
SAFE (0-30): خدمة معروفة، محل حضوري، فاتورة، شخص معروف، مبلغ صغير
MEDIUM (31-60): متجر إلكتروني غير موثق مع رقم طلب، فرد مع سبب معقول
HIGH (61-80): فرد غريب + مبلغ كبير + سبب غامض، متجر غير موثق بلا ضمان
CRITICAL (81-100): كريبتو/استثمار، سوشيال ميديا، ضغط للإسراع، شخص مجهول تماماً

تعليمات:
- لا تعطي تقييم عالي بدون دليل واضح
- وجود فاتورة يقلل المخاطر كثيراً
- المحل الحضوري أكثر أماناً من الإلكتروني
- الاسم المؤسسي (شركة، محل) أقل خطراً من الفرد المجهول

أعد JSON بالحقول: riskScore (0-100), riskLevel (low|medium|high|critical), recommendation (block|warn|allow), reasoning (جملة واحدة بالعربية), redFlags (مصفوفة), predictions (مصفوفة)`

  const userPrompt = JSON.stringify({
    beneficiary,
    amount_sar: amount,
    stated_reasons: allContext || 'لم يُذكر سبب',
    previous_transfers_to_beneficiary: prevCount,
    current_balance: currentBalance,
  })

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 450,
  })

  try {
    const result = JSON.parse(response.choices[0].message.content)
    // Normalise fields
    const score = Math.min(Math.max(result.riskScore || result.risk_score || 50, 0), 100)
    return {
      riskScore: score,
      riskLevel: result.riskLevel || result.risk_level || 'medium',
      recommendation: result.recommendation || (score > 65 ? 'block' : 'allow'),
      reasoning: result.reasoning || result.reason || '',
      redFlags: result.redFlags || result.red_flags || [],
      predictions: result.predictions || [],
    }
  } catch {
    return { riskScore: 50, riskLevel: 'medium', recommendation: 'warn',
      reasoning: 'تعذّر التحليل — تصرف بحذر.', redFlags: [], predictions: [] }
  }
}
