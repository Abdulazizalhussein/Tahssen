import { getClient, MODEL } from './llm.js'

export async function chat({ messages, accountData }) {
  const client = getClient()

  const account = accountData || {}
  const {
    balance = 0,
    monthlyBudget = 0,
    monthlySpent = 0,
    monthlyIncome = 0,
    fixedExpenses = [],
    totalFixedExpenses = 0,
    transactions = [],
    lang = 'ar',
  } = account

  // Bound + sanitize account data: it is client-supplied, so cap array sizes
  // and coerce numerics (prevents prompt-size blowups and self-injection).
  const recent = (Array.isArray(transactions) ? transactions : []).slice(0, 10).map((t) => ({
    amount: Number(t?.amount) || 0,
    beneficiary: String(t?.beneficiary ?? '').slice(0, 60),
    reason: String(t?.reason ?? '').slice(0, 120),
    riskScore: Number(t?.riskScore) || 0,
    blocked: Boolean(t?.blocked),
    date: t?.timestamp ? new Date(t.timestamp).toISOString().slice(0, 10) : '',
  }))

  const fixedList = (Array.isArray(fixedExpenses) ? fixedExpenses : [])
    .slice(0, 30)
    .map((e) => `${String(e?.name ?? '').slice(0, 40)}: ${Number(e?.amount) || 0} SAR`)
    .join(', ') || 'none'
  const discretionary = monthlyIncome - totalFixedExpenses
  const remaining = monthlyIncome - totalFixedExpenses - monthlySpent

  const sysPrompt = `You are Tahseen, an AI financial protection agent for Alinma Bank.
You have access to the user's live account data:
- Current balance: ${balance} SAR
- Monthly income: ${monthlyIncome} SAR
- Fixed expenses: ${fixedList}
- Total fixed commitments: ${totalFixedExpenses} SAR
- Available discretionary budget: ${discretionary} SAR
- Already spent this month: ${monthlySpent} SAR
- Remaining discretionary budget: ${remaining} SAR
- Monthly budget: ${monthlyBudget} SAR
- Recent transactions (newest first): ${JSON.stringify(recent)}
- Today's date: ${new Date().toISOString().slice(0, 10)}

Answer ${lang === 'en' ? 'in English' : 'in Arabic primarily'}. Be specific and use the
actual numbers above. Give concrete predictions, warnings, and financial advice based on
their real data. When income is set, anchor advice on the discretionary budget (income
minus fixed commitments) rather than total balance. Keep answers concise and practical.
Do not invent transactions that are not in the data. You never execute transfers yourself;
you only advise.`

  // Only user/assistant turns reach the model; the system prompt is ours.
  const turns = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content }))

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      max_tokens: 500,
      messages: [{ role: 'system', content: sysPrompt }, ...turns],
    })
    const content = response.choices?.[0]?.message?.content
    if (content && content.trim()) return content.trim()
  } catch (err) {
    console.error('[chatAgent] chat failed:', err?.message || err)
  }
  // Degrade gracefully (like the other agents) instead of throwing a 500.
  return lang === 'en'
    ? 'Sorry — I could not generate a reply right now. Please try again.'
    : 'عذراً، تعذّر إنشاء رد الآن. يرجى المحاولة مرة أخرى.'
}
