// ─────────────────────────────────────────────────────────────────
//  Tahseen Smart Recommendations agent.
//
//  Always returns a deterministic month-end forecast + a set of
//  quantified, personalized recommendations computed from the real
//  account data — so the feature is instant, offline-safe, and never
//  empty. When the backend AI is configured it enriches/overrides the
//  recommendation list; the forecast stays deterministic.
// ─────────────────────────────────────────────────────────────────

import { apiRecommend } from '../api/client'

const CATEGORIES = new Set(['save', 'protect', 'plan', 'spend', 'grow'])
const PRIORITIES = new Set(['high', 'medium', 'low'])
const round = (n) => Math.round(Number(n) || 0)

/** Deterministic month-end cashflow forecast + savings headroom. */
export function computeForecast(account) {
  const { balance = 0, monthlyIncome = 0, totalFixedExpenses = 0, monthlySpent = 0, monthlyBudget = 0 } = account
  const day = new Date().getDate()
  const daysLeft = Math.max(0, 30 - day)
  const dailyRate = day > 0 ? monthlySpent / day : 0
  const predictedMonthEndBalance = Math.max(0, round(balance - dailyRate * daysLeft))
  const discretionary = monthlyIncome - totalFixedExpenses
  const remaining = discretionary - monthlySpent
  const potentialSavings = round(
    monthlyIncome > 0 ? Math.max(0, Math.min(remaining, monthlyIncome * 0.2)) : Math.max(0, monthlyBudget - monthlySpent)
  )
  return { predictedMonthEndBalance, potentialSavings, remaining, discretionary, daysLeft }
}

/** Deterministic, bilingual recommendations grounded in the numbers. */
export function localRecommendations(account) {
  const en = (account.lang || 'ar') === 'en'
  const { balance = 0, monthlyIncome = 0, totalFixedExpenses = 0, monthlySpent = 0, monthlyBudget = 0, transactions = [] } = account
  const blocked = transactions.filter((t) => t.blocked)
  const blockedAmount = round(blocked.reduce((s, t) => s + (t.amount || 0), 0))
  const discretionary = monthlyIncome - totalFixedExpenses
  const remaining = discretionary - monthlySpent
  const savingsTarget = round(monthlyIncome * 0.1)
  const spendRatio = monthlyBudget > 0 ? monthlySpent / monthlyBudget : 0
  const fixedShare = monthlyIncome > 0 ? totalFixedExpenses / monthlyIncome : 0

  const recs = []

  if (blockedAmount > 0) {
    recs.push({
      id: 'protected', category: 'protect', priority: 'high', impact: blockedAmount,
      title: en ? `You avoided ${blocked.length} risky transfer(s)` : `أوقفت ${blocked.length} تحويلاً مشبوهاً`,
      detail: en
        ? 'Tahseen blocked these before the money left your account. Keep verifying new payees before you send.'
        : 'أوقفها تحصين قبل خروج المال من حسابك. واصل التحقق من المستفيدين الجدد قبل التحويل.',
    })
  }

  if (monthlyIncome <= 0) {
    recs.push({
      id: 'setup_income', category: 'plan', priority: 'high', impact: 0,
      title: en ? 'Add your monthly income' : 'أضف مدخولك الشهري',
      detail: en
        ? 'Set your income in Settings to unlock accurate budgeting and sharper recommendations.'
        : 'حدّد مدخولك في الإعدادات لتفعيل ميزانية دقيقة وتوصيات أوضح.',
    })
  }

  if (monthlyIncome > 0 && remaining < 0) {
    recs.push({
      id: 'deficit', category: 'plan', priority: 'high', impact: Math.abs(round(remaining)),
      title: en ? 'You may run short before payday' : 'قد ينقصك المال قبل الراتب',
      detail: en
        ? 'Your spending has passed your discretionary budget. Trim non-essentials to close the gap.'
        : 'تجاوز إنفاقك ميزانيتك المتاحة. قلّل المصاريف غير الضرورية لتغطية الفارق.',
    })
  } else if (spendRatio > 0.85) {
    recs.push({
      id: 'high_spend', category: 'spend', priority: 'medium', impact: round(Math.max(0, monthlySpent - monthlyBudget * 0.85)),
      title: en ? `You've used ${Math.round(spendRatio * 100)}% of your budget` : `أنفقت ${Math.round(spendRatio * 100)}% من ميزانيتك`,
      detail: en
        ? 'Ease off discretionary spending for the rest of the month to stay comfortably within budget.'
        : 'خفّف الإنفاق الاختياري لبقية الشهر لتبقى ضمن ميزانيتك بأريحية.',
    })
  }

  if (monthlyIncome > 0 && savingsTarget > 0 && remaining >= savingsTarget) {
    recs.push({
      id: 'save', category: 'save', priority: 'medium', impact: savingsTarget,
      title: en ? `Set aside ${savingsTarget.toLocaleString('en-US')} this month` : `ادّخر ${savingsTarget.toLocaleString('ar-SA')} هذا الشهر`,
      detail: en
        ? 'You have room to save 10% of your income. Move it out early before it gets spent.'
        : 'لديك متّسع لادّخار 10% من دخلك. حوّله مبكراً قبل أن يُنفق.',
    })
  }

  if (fixedShare > 0.5) {
    recs.push({
      id: 'fixed_heavy', category: 'plan', priority: 'low', impact: round(totalFixedExpenses),
      title: en ? 'Your fixed commitments are heavy' : 'التزاماتك الثابتة مرتفعة',
      detail: en
        ? `Fixed expenses are ${Math.round(fixedShare * 100)}% of income. Review subscriptions you no longer use.`
        : `مصاريفك الثابتة ${Math.round(fixedShare * 100)}% من دخلك. راجع الاشتراكات التي لم تعد تستخدمها.`,
    })
  }

  // Emergency-fund buffer target — a concrete "grow" goal for healthy accounts.
  if (monthlyIncome > 0 && remaining >= 0) {
    const bufferTarget = round(monthlyIncome * 3)
    if (balance < bufferTarget) {
      recs.push({
        id: 'buffer', category: 'grow', priority: 'low', impact: round(bufferTarget - balance),
        title: en ? 'Build a 3-month safety buffer' : 'ابْنِ احتياط طوارئ لـ 3 أشهر',
        detail: en
          ? `Aim for ${bufferTarget.toLocaleString('en-US')} SAR (3 months of income) so a surprise never derails you.`
          : `استهدف ${bufferTarget.toLocaleString('ar-SA')} ر.س (دخل 3 أشهر) حتى لا يربكك أي طارئ.`,
      })
    }
  }

  // Protection reassurance — on-brand, always useful when nothing was blocked.
  if (blockedAmount === 0) {
    recs.push({
      id: 'protection_on', category: 'protect', priority: 'low', impact: 0,
      title: en ? 'Tahseen protection is active' : 'حماية تحصين مفعّلة',
      detail: en
        ? 'Every transfer is reviewed before it goes through. Add trusted payees for faster, safer transfers.'
        : 'كل تحويل يُراجَع قبل تنفيذه. أضف مستفيديك الموثوقين لتحويلات أسرع وأكثر أماناً.',
    })
  }

  if (recs.length === 0) {
    recs.push({
      id: 'healthy', category: 'grow', priority: 'low', impact: round(balance * 0.05),
      title: en ? 'Your finances look healthy' : 'وضعك المالي ممتاز',
      detail: en
        ? 'Nothing urgent. Consider growing your buffer or a savings goal for the months ahead.'
        : 'لا شيء عاجل. فكّر في تنمية احتياطك أو هدف ادّخار للأشهر القادمة.',
    })
  }

  return recs.slice(0, 6)
}

function normalize(list) {
  return (Array.isArray(list) ? list : [])
    .filter((r) => r && typeof r.title === 'string')
    .slice(0, 6)
    .map((r, i) => ({
      id: r.id || `ai_${i}`,
      title: String(r.title).slice(0, 120),
      detail: String(r.detail || '').slice(0, 300),
      category: CATEGORIES.has(r.category) ? r.category : 'plan',
      priority: PRIORITIES.has(r.priority) ? r.priority : 'medium',
      impact: Math.max(0, round(r.impact)),
    }))
}

/** Forecast (deterministic) + recommendations (AI if available, else local). */
export async function getRecommendations(account) {
  const forecast = computeForecast(account)
  try {
    const data = await apiRecommend(account)
    const recs = normalize(data?.recommendations)
    if (recs.length) return { forecast, recommendations: recs, source: 'ai' }
  } catch {
    /* fall back to the local heuristic below */
  }
  return { forecast, recommendations: localRecommendations(account), source: 'local' }
}
