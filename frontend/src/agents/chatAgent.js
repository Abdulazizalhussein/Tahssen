// ─────────────────────────────────────────────────────────────────
//  Tahseen Chat Agent — port of src/agents/chatAgent.js
//  Local computation functions are pure (no API). AI chat goes
//  through apiChat which POSTs to the backend.
// ─────────────────────────────────────────────────────────────────

import { apiChat } from '../api/client'

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

export async function chat(account, messages) {
  const accountData = {
    balance: account.balance,
    monthlySpent: account.monthlySpent,
    monthlyBudget: account.monthlyBudget,
    monthlyIncome: account.monthlyIncome,
    fixedExpenses: account.fixedExpenses,
  }
  const withSystem = [
    { role: 'system', content: systemPrompt(account) },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]
  return apiChat(withSystem, accountData)
}

export async function generateInsights(account) {
  const {
    balance,
    monthlyBudget,
    monthlySpent,
    monthlyIncome = 0,
    totalFixedExpenses = 0,
    transactions,
  } = account
  const stats = computeStats(transactions)

  // Local health score: penalise blocked txs and overspend
  const blockedRatio = stats.sentCount + stats.blockedCount > 0
    ? stats.blockedCount / (stats.sentCount + stats.blockedCount) : 0
  const spendRatio = monthlyBudget > 0 ? monthlySpent / monthlyBudget : 0
  const healthScore = Math.max(0, Math.min(100, Math.round(
    100 - blockedRatio * 40 - Math.max(0, spendRatio - 0.8) * 100
  )))

  const discretionary = monthlyIncome - totalFixedExpenses
  const remaining = discretionary - monthlySpent
  const dayOfMonth = new Date().getDate()
  const daysLeft = 30 - dayOfMonth
  const dailyRate = dayOfMonth > 0 ? monthlySpent / dayOfMonth : 0
  const predictedMonthEndBalance = balance - dailyRate * daysLeft

  const insights = []
  if (spendRatio > 0.8) insights.push(`أنفقت ${Math.round(spendRatio * 100)}% من ميزانيتك الشهرية`)
  if (stats.blockedCount > 0) insights.push(`تم إيقاف ${stats.blockedCount} معاملة مشبوهة`)
  if (remaining > 0 && monthlyIncome > 0) insights.push(`المتبقي من الدخل التقديري: ${Math.round(remaining)} ر.س`)

  return {
    healthScore,
    insights,
    monthEndPrediction: predictedMonthEndBalance > 0
      ? `يُتوقع رصيدك نهاية الشهر: ${Math.round(predictedMonthEndBalance).toLocaleString('ar-SA')} ر.س`
      : 'يُتوقع انخفاض الرصيد نهاية الشهر — راجع إنفاقك',
    predictedMonthEndBalance,
    stats,
  }
}

export async function accountStatusLine(account) {
  const { balance, monthlyBudget, monthlySpent, transactions } = account
  const blockedCount = transactions.filter((t) => t.blocked).length
  const spendRatio = monthlyBudget > 0 ? monthlySpent / monthlyBudget : 0

  if (blockedCount > 0) return `تم إيقاف ${blockedCount} معاملة مشبوهة هذا الشهر`
  if (spendRatio > 0.9) return `تجاوزت 90% من الميزانية — رصيدك ${balance.toLocaleString('ar-SA')} ر.س`
  if (spendRatio > 0.7) return `أنفقت ${Math.round(spendRatio * 100)}% من ميزانيتك الشهرية`
  return `رصيدك ${balance.toLocaleString('ar-SA')} ر.س — وضعك المالي مستقر`
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
