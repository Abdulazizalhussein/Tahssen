// ─────────────────────────────────────────────────────────────────
//  Tahseen Chat Agent — port of src/agents/chatAgent.js
//  Local computation functions are pure (no API). AI chat goes
//  through apiChat which POSTs to the backend.
// ─────────────────────────────────────────────────────────────────

import { apiChat } from '../api/client'
import { computeForecast } from './recommendAgent'

export async function chat(account, messages) {
  const accountData = {
    balance: account.balance,
    monthlySpent: account.monthlySpent,
    monthlyBudget: account.monthlyBudget,
    monthlyIncome: account.monthlyIncome,
    fixedExpenses: account.fixedExpenses,
    totalFixedExpenses: account.totalFixedExpenses,
    transactions: account.transactions,
    lang: account.lang,
    forecast: computeForecast(account), // month-end projection so advice matches the app
  }
  // Send only user/assistant turns — the backend builds the system prompt from
  // accountData (server-authoritative), so no system role crosses the wire.
  const turns = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }))
  return apiChat(turns, accountData)
}

// Locale-aware integer formatting for the computed insight strings.
const fmt = (n, lang) => Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'ar-SA')
const CUR = (lang) => (lang === 'en' ? 'SAR' : 'ر.س')

export async function generateInsights(account) {
  const {
    balance,
    monthlyBudget,
    monthlySpent,
    monthlyIncome = 0,
    totalFixedExpenses = 0,
    transactions,
    lang = 'ar',
  } = account
  const en = lang === 'en'
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
  if (spendRatio > 0.8)
    insights.push(en ? `You've spent ${Math.round(spendRatio * 100)}% of your monthly budget` : `أنفقت ${Math.round(spendRatio * 100)}% من ميزانيتك الشهرية`)
  if (stats.blockedCount > 0)
    insights.push(en ? `${stats.blockedCount} suspicious transaction(s) were blocked` : `تم إيقاف ${stats.blockedCount} معاملة مشبوهة`)
  if (remaining > 0 && monthlyIncome > 0)
    insights.push(en ? `Remaining discretionary income: ${fmt(remaining, lang)} ${CUR(lang)}` : `المتبقي من الدخل التقديري: ${fmt(remaining, lang)} ${CUR(lang)}`)

  return {
    healthScore,
    insights,
    monthEndPrediction: predictedMonthEndBalance > 0
      ? (en ? `Projected month-end balance: ${fmt(predictedMonthEndBalance, lang)} ${CUR(lang)}` : `يُتوقع رصيدك نهاية الشهر: ${fmt(predictedMonthEndBalance, lang)} ${CUR(lang)}`)
      : (en ? 'Your balance is projected to drop by month-end — review your spending' : 'يُتوقع انخفاض الرصيد نهاية الشهر — راجع إنفاقك'),
    predictedMonthEndBalance,
    stats,
  }
}

export async function accountStatusLine(account) {
  const { balance, monthlyBudget, monthlySpent, transactions, lang = 'ar' } = account
  const en = lang === 'en'
  const blockedCount = transactions.filter((t) => t.blocked).length
  const spendRatio = monthlyBudget > 0 ? monthlySpent / monthlyBudget : 0

  if (blockedCount > 0)
    return en ? `${blockedCount} suspicious transaction(s) blocked this month` : `تم إيقاف ${blockedCount} معاملة مشبوهة هذا الشهر`
  if (spendRatio > 0.9)
    return en ? `Over 90% of budget used — balance ${fmt(balance, lang)} ${CUR(lang)}` : `تجاوزت 90% من الميزانية — رصيدك ${fmt(balance, lang)} ${CUR(lang)}`
  if (spendRatio > 0.7)
    return en ? `You've spent ${Math.round(spendRatio * 100)}% of your monthly budget` : `أنفقت ${Math.round(spendRatio * 100)}% من ميزانيتك الشهرية`
  return en ? `Balance ${fmt(balance, lang)} ${CUR(lang)} — your finances are stable` : `رصيدك ${fmt(balance, lang)} ${CUR(lang)} — وضعك المالي مستقر`
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
