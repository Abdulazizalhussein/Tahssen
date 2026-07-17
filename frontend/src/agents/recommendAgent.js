// ─────────────────────────────────────────────────────────────────
//  Tahseen Smart Recommendations agent.
//
//  Everything derives from ONE projection model (computeForecast) so the
//  numbers are internally consistent: the projected month-end balance, the
//  savings headroom, and every recommendation's SAR impact all come from the
//  same forecast. It is instant and offline-safe (deterministic), and the
//  backend AI enriches the recommendation list when configured.
// ─────────────────────────────────────────────────────────────────

import { apiRecommend } from '../api/client'
import { computeForecast } from '../lib/finance'

// Re-export so existing importers (chatAgent, pages) keep working.
export { computeForecast }

const CATEGORIES = new Set(['save', 'protect', 'plan', 'spend', 'grow'])
const PRIORITIES = new Set(['high', 'medium', 'low'])
const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round = (n) => Math.round(num(n))

/** Deterministic, bilingual recommendations — all impacts come from `f`. */
export function localRecommendations(account, f) {
  const en = (account.lang || 'ar') === 'en'
  const { balance = 0, monthlyIncome = 0, transactions = [] } = account
  const blocked = transactions.filter((t) => t.blocked)
  const blockedAmount = round(blocked.reduce((s, t) => s + num(t.amount), 0))
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
        ? 'Set your income in Settings to unlock accurate forecasting and sharper recommendations.'
        : 'حدّد مدخولك في الإعدادات لتفعيل توقّعات دقيقة وتوصيات أوضح.',
    })
  }

  if (f.overspending) {
    const over = round(f.projectedMonthlySpend - (f.income > 0 ? f.discretionary : f.projectedMonthlySpend))
    recs.push({
      id: 'pace', category: 'spend', priority: 'high', impact: f.projectedRemainingSpend,
      title: en ? `At this pace you'll overspend this month` : 'بوتيرتك الحالية ستتجاوز ميزانيتك',
      detail: en
        ? `You're on track to spend ${f.projectedMonthlySpend.toLocaleString('en-US')} SAR. Slow the daily pace to stay on budget.`
        : `أنت متّجه لإنفاق ${f.projectedMonthlySpend.toLocaleString('ar-SA')} ر.س هذا الشهر. خفّف الإنفاق اليومي لتبقى ضمن ميزانيتك.`,
    })
  }

  if (f.potentialSavings > 0) {
    recs.push({
      id: 'save', category: 'save', priority: 'medium', impact: f.potentialSavings,
      title: en ? `You can save ${f.potentialSavings.toLocaleString('en-US')} this month` : `يمكنك ادّخار ${f.potentialSavings.toLocaleString('ar-SA')} هذا الشهر`,
      detail: en
        ? 'This is the unspent part of your budget at your current pace. Move it aside early before it gets spent.'
        : 'هذا هو المتبقّي من ميزانيتك بوتيرة إنفاقك الحالية. حوّله مبكراً قبل أن يُنفق.',
    })
  }

  // Forecast-driven caution when the month-end balance drops sharply.
  if (f.predictedMonthEndBalance > 0 && f.balance > 0 && f.predictedMonthEndBalance < f.balance * 0.55) {
    recs.push({
      id: 'forecast_drop', category: 'plan', priority: 'medium', impact: round(f.balance - f.predictedMonthEndBalance),
      title: en ? `Your balance is set to fall to ${f.predictedMonthEndBalance.toLocaleString('en-US')}` : `رصيدك متوقّع أن ينخفض إلى ${f.predictedMonthEndBalance.toLocaleString('ar-SA')}`,
      detail: en
        ? 'Based on your spending pace and upcoming commitments. Trim non-essentials to protect your buffer.'
        : 'بناءً على وتيرة إنفاقك والتزاماتك القادمة. قلّل المصاريف غير الضرورية للحفاظ على احتياطك.',
    })
  }

  // Emergency-fund buffer target — a concrete "grow" goal.
  if (monthlyIncome > 0 && !f.overspending) {
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
    const data = await apiRecommend(account, forecast)
    const recs = normalize(data?.recommendations)
    if (recs.length) return { forecast, recommendations: recs, source: 'ai' }
  } catch {
    /* fall back to the local heuristic below */
  }
  return { forecast, recommendations: localRecommendations(account, forecast), source: 'local' }
}
