import { getClient, MODEL } from './client'

const SYSTEM = `You are Tahseen's fraud detection engine for Alinma Bank.
Analyze the proposed transfer and return a structured risk assessment.
Be specific and data-driven. Consider:
- Is this a new beneficiary (never seen in the provided history)?
- Is the amount unusual versus previous transfers and the account profile?
- Does the stated reason and the user's interrogation answers match the transfer profile?
- Are there timing, pattern, or social-engineering red flags?
The "reasoning" field MUST be written in Arabic. Predictions and redFlags should be
short, specific phrases written in the same language as the user's answers.
Return ONLY valid JSON matching the requested schema.`

export async function analyzeTransfer(
  apiKey,
  {
    beneficiary,
    amount,
    reason,
    conversationHistory = [],
    previousTransfers = [],
    currentBalance,
    monthlySpent,
    monthlyBudget,
  }
) {
  const client = getClient(apiKey)

  const payload = {
    transfer: { beneficiary, amount: Number(amount), reason },
    previousTransfersToThisBeneficiary: previousTransfers,
    accountContext: { currentBalance, monthlySpent, monthlyBudget },
    interrogationHistory: conversationHistory,
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
      reasoning: 'detailed explanation in Arabic',
    },
  }

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: JSON.stringify(payload) },
    ],
    response_format: { type: 'json_object' },
  })

  const parsed = JSON.parse(response.choices[0].message.content)

  return {
    riskScore: clamp(parsed.riskScore),
    riskLevel: parsed.riskLevel || levelFromScore(clamp(parsed.riskScore)),
    isNewBeneficiary: !!parsed.isNewBeneficiary,
    hasPreviousTransfers: !!parsed.hasPreviousTransfers,
    previousTransferCount: Number(parsed.previousTransferCount) || 0,
    previousTotalAmount: Number(parsed.previousTotalAmount) || 0,
    predictions: Array.isArray(parsed.predictions) ? parsed.predictions : [],
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    recommendation: parsed.recommendation || 'warn',
    reasoning: parsed.reasoning || '',
  }
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))

const levelFromScore = (s) => {
  if (s >= 80) return 'critical'
  if (s >= 60) return 'high'
  if (s >= 35) return 'medium'
  return 'low'
}
