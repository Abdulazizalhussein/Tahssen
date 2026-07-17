// ─────────────────────────────────────────────────────────────────
//  Pure financial model for Tahseen — NO framework/Vite imports, so it
//  is reusable across agents AND unit-testable in isolation (see
//  scripts/review-services.mjs). Everything is derived arithmetic.
// ─────────────────────────────────────────────────────────────────

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round = (n) => Math.round(num(n))

/**
 * Month-end projection. Every figure derives from the others so the UI is
 * internally consistent:
 *   dailyBurn → projectedRemainingSpend → predictedMonthEndBalance,
 *   plus potentialSavings, savingsRate and an overspending flag.
 * When there is no spend yet this month it uses the budgeted pace, so the
 * forecast is never a flat copy of the current balance.
 */
export function computeForecast(account) {
  const balance = num(account.balance)
  const income = num(account.monthlyIncome)
  const fixed = num(account.totalFixedExpenses)
  const spent = num(account.monthlySpent)
  const budget = num(account.monthlyBudget)

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const daysElapsed = Math.max(1, dayOfMonth)
  const daysLeft = Math.max(0, daysInMonth - dayOfMonth)

  const discretionary = income > 0 ? Math.max(0, income - fixed) : budget
  const budgetedPace = (budget > 0 ? budget : discretionary * 0.6) / daysInMonth
  const dailyBurn = spent > 0 ? spent / daysElapsed : budgetedPace

  const projectedRemainingSpend = round(dailyBurn * daysLeft)
  const projectedMonthlySpend = round(spent + projectedRemainingSpend)
  const fixedDueRemaining = round(fixed * (daysLeft / daysInMonth))
  const predictedMonthEndBalance = Math.max(0, round(balance - projectedRemainingSpend - fixedDueRemaining))

  const savableBase = budget > 0 ? budget : discretionary
  const potentialSavings = round(Math.max(0, savableBase - projectedMonthlySpend))
  const savingsRate = income > 0 ? Math.max(0, (income - fixed - projectedMonthlySpend) / income) : 0
  const overspending = projectedMonthlySpend > savableBase && savableBase > 0

  return {
    balance, income, fixed, daysLeft, daysInMonth, discretionary,
    dailyBurn: round(dailyBurn),
    projectedRemainingSpend, projectedMonthlySpend, fixedDueRemaining,
    predictedMonthEndBalance, potentialSavings,
    savingsRate: Math.round(savingsRate * 100) / 100,
    overspending,
  }
}

/**
 * Financial-health score (0–100). The dominant factor is a MONTHLY DEFICIT:
 * when fixed commitments + spending exceed income the score collapses toward
 * red. Also weighs the fixed-commitment burden (DBR), savings rate,
 * overspending vs budget, blocked-fraud attempts, and a negative balance.
 */
export function computeHealth(account) {
  const balance = num(account.balance)
  const income = num(account.monthlyIncome)
  const fixed = num(account.totalFixedExpenses)
  const spent = num(account.monthlySpent)
  const budget = num(account.monthlyBudget)
  const txns = Array.isArray(account.transactions) ? account.transactions : []

  const surplus = income - fixed - spent
  const savingsRate = income > 0 ? surplus / income : 0
  const dbr = income > 0 ? fixed / income : 0

  let score = 100
  const flags = []

  if (income > 0) {
    if (surplus < 0) {
      // Deficit — commitments/spending exceed income. The dominant negative.
      const deficitRatio = Math.min(1.5, Math.abs(surplus) / income)
      score -= 45 + deficitRatio * 30
      flags.push('deficit')
    } else if (savingsRate < 0.05) {
      score -= 20
      flags.push('low_savings')
    } else if (savingsRate < 0.1) {
      score -= 8
    }

    if (dbr > 0.65) { score -= 20; flags.push('high_commitments') }
    else if (dbr > 0.45) { score -= 12 }
    else if (dbr > 0.33) { score -= 5 }
  } else {
    score -= 12
    flags.push('no_income')
  }

  const spendRatio = budget > 0 ? spent / budget : 0
  if (spendRatio > 1) { score -= 15; flags.push('over_budget') }
  else if (spendRatio > 0.9) { score -= 8 }

  const blocked = txns.filter((t) => t && t.blocked).length
  if (txns.length > 0 && blocked > 0) {
    score -= Math.round((blocked / txns.length) * 25)
    flags.push('fraud_attempts')
  }

  if (balance < 0) { score -= 15; flags.push('negative_balance') }
  else if (income > 0 && balance < income * 0.5) { score -= 8 }

  score = Math.max(0, Math.min(100, Math.round(score)))
  const stage = score >= 70 ? 'healthy' : score >= 40 ? 'watch' : 'critical'
  return {
    score, stage, flags,
    surplus: round(surplus),
    savingsRate: Math.round(savingsRate * 100) / 100,
    dbr: Math.round(dbr * 100) / 100,
    deficit: surplus < 0,
  }
}

/** Transaction rollups used by the analytics + insights. */
export function computeStats(transactions) {
  const list = Array.isArray(transactions) ? transactions : []
  const sent = list.filter((t) => t && !t.blocked)
  const blocked = list.filter((t) => t && t.blocked)
  const totalSent = sent.reduce((s, t) => s + num(t.amount), 0)
  const totalBlocked = blocked.reduce((s, t) => s + num(t.amount), 0)
  const avgTransfer = sent.length ? totalSent / sent.length : 0
  return {
    totalSent,
    totalBlocked,
    avgTransfer,
    sentCount: sent.length,
    blockedCount: blocked.length,
    newBeneficiaries: countNewBeneficiaries(list),
  }
}

function countNewBeneficiaries(transactions) {
  const seen = new Set()
  let count = 0
  const chronological = [...transactions].sort((a, b) => num(a.timestamp) - num(b.timestamp))
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

/* ─── Chart series (derived, for the analytics visualizations) ─────── */

/**
 * Cumulative spending trajectory for the current month:
 *  - `actual`   cumulative real spend (non-blocked transfers) up to today
 *  - `projected` continues from today to month-end at the forecast pace
 *  - `budget`   the reference line to compare against
 * so you can see whether — and when — you'll cross the budget.
 */
export function dailySpendSeries(account, forecast) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = now.getDate()

  const perDay = new Array(daysInMonth + 1).fill(0)
  for (const t of Array.isArray(account.transactions) ? account.transactions : []) {
    if (!t || t.blocked) continue
    const d = new Date(t.timestamp)
    if (d.getFullYear() === year && d.getMonth() === month) perDay[d.getDate()] += num(t.amount)
  }

  const actual = []
  let cum = 0
  for (let day = 1; day <= today; day++) { cum += perDay[day]; actual.push({ day, value: round(cum) }) }

  const burn = num(forecast?.dailyBurn)
  const projected = [{ day: today, value: round(cum) }]
  let pc = cum
  for (let day = today + 1; day <= daysInMonth; day++) { pc += burn; projected.push({ day, value: round(pc) }) }

  const budget = num(account.monthlyBudget) || num(forecast?.discretionary) || 0
  const maxY = Math.max(pc, budget, 1)
  return { actual, projected, budget, daysInMonth, today, maxY, projectedTotal: round(pc) }
}

// Gregorian seasonal spend multipliers (Ramadan/Eid/summer/back-to-school peaks).
const SEASON = [0.95, 0.9, 1.15, 1.28, 1.02, 1.12, 1.22, 1.16, 1.06, 0.94, 1.0, 1.12]

/**
 * Monthly spending over the last `count` months. The current month is the
 * projected total; prior months follow a deterministic Saudi seasonal pattern
 * scaled to the customer's own baseline — so the chart shows which months rise
 * and fall. Marks the peak month and returns the average.
 */
export function monthlySpendSeries(account, forecast, count = 6) {
  const now = new Date()
  const baseline =
    num(forecast?.projectedMonthlySpend) ||
    num(account.monthlyBudget) ||
    Math.max(0, num(account.monthlyIncome) - num(account.totalFixedExpenses)) * 0.6 ||
    2000

  const months = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mi = d.getMonth()
    const isCurrent = i === 0
    const jitter = 0.92 + ((mi * 37) % 16) / 100 // deterministic 0.92..1.07
    const total = isCurrent
      ? (num(forecast?.projectedMonthlySpend) || round(baseline))
      : Math.max(0, round(baseline * SEASON[mi] * jitter))
    months.push({ year: d.getFullYear(), month: mi, total, isCurrent })
  }
  const peak = Math.max(1, ...months.map((m) => m.total))
  months.forEach((m) => { m.isPeak = m.total === peak })
  const avg = Math.round(months.reduce((s, m) => s + m.total, 0) / months.length)
  return { months, peak, avg }
}

/** Fixed-expense totals grouped by category, for the donut. */
export function categorySpendSeries(fixedExpenses) {
  const byCat = {}
  for (const e of Array.isArray(fixedExpenses) ? fixedExpenses : []) {
    const c = e?.category || 'other'
    byCat[c] = (byCat[c] || 0) + num(e?.amount)
  }
  const entries = Object.entries(byCat)
    .map(([category, amount]) => ({ category, amount: round(amount) }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount)
  const total = entries.reduce((s, e) => s + e.amount, 0)
  return { entries, total }
}
