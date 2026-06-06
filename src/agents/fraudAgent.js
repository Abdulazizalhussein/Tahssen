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

  const systemPrompt = `أنت محرك تقييم مخاطر الاحتيال المالي في تحصين.

قيّم الحوالة بعقلانية — حجم المبلغ وحده لا يعني خطراً.

## معايير التقييم

✅ منخفض (0-30):
- الغرض واضح ومعقول (شراء، إيجار، راتب، خدمة)
- فيه ضمان أو فاتورة
- محل أو جهة حضورية / معروفة
- مستفيد تم التحويل له سابقاً
- خدمة رقمية موثوقة

⚠️ متوسط (31-60):
- شخص غير معروف + مبلغ متوسط + سبب معقول
- متجر إلكتروني بدون ضمان لكن الغرض منطقي
- أول تحويل لشخص مع سبب كافٍ

🔶 مرتفع (61-80):
- شخص مجهول + مبلغ كبير + سبب غامض أو غير مقنع
- متجر غير موثق + لا ضمان + مبلغ كبير
- استعجال غير مبرر

⛔ احتيال (81-100):
- وعود ربح/كريبتو/استثمار
- شخص من وسائل التواصل يطلب مال
- "اشتر بطاقات"

ملاحظة مهمة: المؤسسات والشركات أقل خطراً من الأفراد المجهولين.
المبالغ الكبيرة لجهات معروفة (مقاولين، خدمات، سداد ديون) طبيعية.

أجب بـ JSON:
{ riskScore: 0-100, riskLevel: "low|medium|high|critical", recommendation: "allow|warn|block", reasoning: "جملة واحدة بالعربي", redFlags: [], predictions: [] }`

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
