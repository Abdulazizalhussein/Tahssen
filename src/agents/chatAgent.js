import { getClient, MODEL } from './client'

function systemPrompt({
  balance,
  monthlyBudget,
  monthlySpent,
  monthlyIncome = 0,
  fixedExpenses = [],
  totalFixedExpenses = 0,
  transactions,
  lang,
}) {
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

  return `You are Tahseen, an AI financial protection agent for Alinma Bank.
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
}

export async function chat(apiKey, account, messages) {
  const client = getClient(apiKey)

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.6,
    max_tokens: 400,
    messages: [
      { role: 'system', content: systemPrompt(account) },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  })

  return response.choices[0].message.content.trim()
}

const INSIGHTS_SYSTEM = `You are Tahseen's analytics engine for Alinma Bank.
Analyze the user's account data and return a structured analysis as ONLY valid JSON:
{
  "healthScore": 0-100 integer reflecting financial health and risk discipline,
  "insights": [ up to 3 short specific strings about their actual data ],
  "monthEndPrediction": "one short sentence predicting end-of-month balance/spending",
  "predictedMonthEndBalance": number
}
Write insights, prediction text in Arabic primarily (English if lang=en).
Base everything strictly on the provided numbers. Do not invent data.`

export async function generateInsights(apiKey, account) {
  const client = getClient(apiKey)

  const {
    balance,
    monthlyBudget,
    monthlySpent,
    monthlyIncome = 0,
    fixedExpenses = [],
    totalFixedExpenses = 0,
    transactions,
    lang,
  } = account
  const stats = computeStats(transactions)

  const payload = {
    lang,
    balance,
    monthlyBudget,
    monthlySpent,
    monthlyIncome,
    fixedExpenses: fixedExpenses.map((e) => ({ name: e.name, amount: e.amount })),
    totalFixedExpenses,
    discretionaryBudget: monthlyIncome - totalFixedExpenses,
    remainingDiscretionary: monthlyIncome - totalFixedExpenses - monthlySpent,
    today: new Date().toISOString().slice(0, 10),
    dayOfMonth: new Date().getDate(),
    stats,
    recentTransactions: transactions.slice(0, 15).map((t) => ({
      amount: t.amount,
      beneficiary: t.beneficiary,
      riskScore: t.riskScore,
      blocked: t.blocked,
      date: new Date(t.timestamp).toISOString().slice(0, 10),
    })),
  }

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    max_tokens: 300,
    messages: [
      { role: 'system', content: INSIGHTS_SYSTEM },
      { role: 'user', content: JSON.stringify(payload) },
    ],
    response_format: { type: 'json_object' },
  })

  const parsed = JSON.parse(response.choices[0].message.content)
  return {
    healthScore: Math.max(0, Math.min(100, Math.round(Number(parsed.healthScore) || 0))),
    insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : [],
    monthEndPrediction: parsed.monthEndPrediction || '',
    predictedMonthEndBalance:
      typeof parsed.predictedMonthEndBalance === 'number'
        ? parsed.predictedMonthEndBalance
        : null,
    stats,
  }
}

const STATUS_SYSTEM = `You are Tahseen, an AI financial protection agent for Alinma Bank.
Given the user's account snapshot, return ONLY valid JSON:
{"status": "<one short sentence about current account health, in Arabic primarily>"}`

export async function accountStatusLine(apiKey, account) {
  const client = getClient(apiKey)
  const { balance, monthlyBudget, monthlySpent, transactions, lang } = account
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    max_tokens: 300,
    messages: [
      { role: 'system', content: STATUS_SYSTEM },
      {
        role: 'user',
        content: JSON.stringify({
          lang,
          balance,
          monthlyBudget,
          monthlySpent,
          transactionCount: transactions.length,
          blockedCount: transactions.filter((t) => t.blocked).length,
        }),
      },
    ],
    response_format: { type: 'json_object' },
  })
  const parsed = JSON.parse(response.choices[0].message.content)
  return parsed.status || ''
}

export function computeStats(transactions) {
  const sent = transactions.filter((t) => !t.blocked)
  const blocked = transactions.filter((t) => t.blocked)
  const totalSent = sent.reduce((s, t) => s + t.amount, 0)
  const totalBlocked = blocked.reduce((s, t) => s + t.amount, 0)
  const avgTransfer = sent.length ? totalSent / sent.length : 0
  const newBeneficiaries = countNewBeneficiaries(transactions)
  return {
    totalSent,
    totalBlocked,
    avgTransfer,
    sentCount: sent.length,
    blockedCount: blocked.length,
    newBeneficiaries,
  }
}

function countNewBeneficiaries(transactions) {
  const seen = new Set()
  let count = 0
  const chronological = [...transactions].sort((a, b) => a.timestamp - b.timestamp)
  for (const t of chronological) {
    const key = (t.beneficiary || '').trim().toLowerCase()
    if (!key) continue
    if (!seen.has(key)) {
      count += 1
      seen.add(key)
    }
  }
  return count
}
