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

/**
 * Spending TIMELINE for the analytics bar chart: a real forward forecast, not a
 * flat history. Returns `pastN` months of actual spend + the current month
 * (consumed base + predicted top) + `futureN` predicted months, so you see where
 * spending is HEADING, not just where it's been.
 *
 * The prediction is trend-aware, not a copy-and-subtract:
 *   level = winsorized, recency-weighted EWMA of observed monthly variable spend,
 *           falling back to the discretionary budget when history is too thin,
 *   trend = damped, capped linear-regression slope (only with enough data),
 * projected forward with geometric damping and clamped to a sane cap.
 *
 * Each month stacks `actual` (consumed, teal) under `predicted` (forecast, gold).
 * The current month's total is pinned to `fixed + forecast.projectedMonthlySpend`
 * so the chart never contradicts the month-end forecast card. `basis` says whether
 * the forecast came from observed behaviour or the budget (for honest labelling).
 */
export function spendTimelineSeries(account, forecast, pastN = 3, futureN = 2) {
  const now = new Date()
  const fixed = round(num(account.totalFixedExpenses))
  const income = num(account.monthlyIncome)
  const budget = num(account.monthlyBudget)
  const txns = Array.isArray(account.transactions) ? account.transactions : []

  // Observed (real) variable spend per calendar month, from non-blocked transfers.
  // Fixed commitments live in a separate store, so transactions are variable-only
  // — no double counting.
  const varByKey = {}
  for (const t of txns) {
    if (!t || t.blocked) continue
    const d = new Date(t.timestamp)
    if (Number.isNaN(d.getTime())) continue
    const k = `${d.getFullYear()}-${d.getMonth()}`
    varByKey[k] = (varByKey[k] || 0) + num(t.amount)
  }
  const keyOf = (d) => `${d.getFullYear()}-${d.getMonth()}`

  // History window (up to 6 prior months) to fit the level + trend.
  const hist = []
  for (let k = 6; k >= 1; k--) hist.push(round(varByKey[keyOf(new Date(now.getFullYear(), now.getMonth() - k, 1))] || 0))
  const monthsWithActivity = hist.filter((v) => v > 0).length

  // Discretionary budget = the app's `monthlyBudget` (already variable-only), else
  // a fraction of income-after-fixed. Used as the fallback forecast baseline.
  const discretionary = income > 0 ? Math.max(0, income - fixed) : budget
  const budgetedVar = budget > 0 ? budget : Math.round(discretionary * 0.6)

  // Robust level: winsorized recency-weighted EWMA of observed spend, else budget.
  const nonZero = hist.filter((v) => v > 0).sort((a, b) => a - b)
  const median = nonZero.length ? nonZero[Math.floor((nonZero.length - 1) / 2)] : 0
  let baseline
  if (monthsWithActivity >= 2 && median > 0) {
    const wins = hist.map((v) => Math.min(v, median * 3)) // clip outliers
    let ewma = wins[0]
    for (let i = 1; i < wins.length; i++) ewma = 0.5 * wins[i] + 0.5 * ewma
    baseline = Math.max(ewma, budgetedVar * 0.05)
  } else {
    baseline = budgetedVar
  }

  // Damped, capped linear trend (needs enough non-zero points to be meaningful).
  let slope = 0
  if (hist.length >= 2 && monthsWithActivity >= 4) {
    const n = hist.length
    const mx = (n - 1) / 2
    const my = hist.reduce((s, v) => s + v, 0) / n
    let sxy = 0, sxx = 0
    for (let i = 0; i < n; i++) { sxy += (i - mx) * (hist[i] - my); sxx += (i - mx) * (i - mx) }
    if (sxx > 0) slope = sxy / sxx
    const capS = 0.25 * baseline
    slope = Math.max(-capS, Math.min(capS, slope))
  }

  const roomAfterFixed = income > 0 ? Math.max(0, income - fixed) : Number.POSITIVE_INFINITY
  const cap = Math.min(Math.max(budget * 1.5, median * 2, baseline), roomAfterFixed)
  const PHI = 0.6
  const expectedVar = (j) => {
    let damp = 0
    for (let k = 1; k <= j; k++) damp += Math.pow(PHI, k) // geometric damping
    return round(Math.max(0, Math.min(baseline + slope * damp, cap)))
  }

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = Math.max(0, Math.min(daysInMonth, num(forecast?.daysLeft)))
  const dayOfMonth = Math.max(1, Math.min(daysInMonth, daysInMonth - daysLeft))
  const variableSoFar = round(varByKey[keyOf(now)] || 0)

  const months = []
  // Past months (oldest → newest): actual consumed = fixed + observed variable.
  for (let k = pastN; k >= 1; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
    const observed = round(varByKey[keyOf(d)] || 0)
    const total = fixed + observed
    months.push({ year: d.getFullYear(), month: d.getMonth(), kind: 'past', fixed, variable: observed, actual: total, predicted: 0, total, isCurrent: false, hasData: observed > 0 })
  }
  // Current month: consumed base + predicted top; total pinned to the forecast.
  {
    const projected = Math.max(0, num(forecast?.projectedMonthlySpend))
    const total = round(fixed + projected)
    const consumed = round(Math.min(total, fixed * (dayOfMonth / daysInMonth) + variableSoFar))
    months.push({ year: now.getFullYear(), month: now.getMonth(), kind: 'current', fixed, variable: round(projected), actual: consumed, predicted: Math.max(0, total - consumed), total, isCurrent: true, hasData: true })
  }
  // Future months: pure forecast (fixed commitments + projected variable).
  for (let j = 1; j <= futureN; j++) {
    const d = new Date(now.getFullYear(), now.getMonth() + j, 1)
    const total = fixed + expectedVar(j)
    months.push({ year: d.getFullYear(), month: d.getMonth(), kind: 'future', fixed, variable: expectedVar(j), actual: 0, predicted: total, total, isCurrent: false, hasData: false })
  }

  const peak = Math.max(1, ...months.map((m) => m.total))
  months.forEach((m) => { m.isPeak = m.total === peak })
  // Average over the actual/near-term side (past + current), not pure forecasts.
  const actualSide = months.filter((m) => m.kind !== 'future')
  const avg = Math.round(actualSide.reduce((s, m) => s + m.total, 0) / Math.max(1, actualSide.length))
  return { months, peak, avg, basis: monthsWithActivity >= 2 ? 'behavior' : 'budget' }
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
