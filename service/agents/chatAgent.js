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

  const recent = transactions.slice(0, 10).map((t) => ({
    amount: t.amount,
    beneficiary: t.beneficiary,
    reason: t.reason,
    riskScore: t.riskScore,
    blocked: t.blocked,
    date: new Date(t.timestamp).toISOString().slice(0, 10),
  }))

  const fixedList = fixedExpenses.map((e) => `${e.name}: ${e.amount} SAR`).join(', ') || 'none'
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

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.6,
    max_tokens: 500,
    messages: [
      { role: 'system', content: sysPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  })

  return response.choices[0].message.content.trim()
}
