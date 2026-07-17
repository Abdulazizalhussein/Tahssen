#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
//  Tahseen service reviewer.
//
//  Exercises every service (finance model, community registry, and the
//  AI agents) with normal AND edge-case inputs, then reports which ones
//  work and which behave unexpectedly. Run:  npm run review
//
//  Without OPENAI_API_KEY the AI agents are checked on their
//  deterministic short-circuits and graceful fallbacks; set the key to
//  also exercise the live model paths.
// ─────────────────────────────────────────────────────────────────

// localStorage shim so the community store (browser module) runs in Node.
globalThis.localStorage = {
  _d: {},
  getItem(k) { return k in this._d ? this._d[k] : null },
  setItem(k, v) { this._d[k] = String(v) },
  removeItem(k) { delete this._d[k] },
}

const R = { pass: 0, fail: 0, services: {} }
function service(name) {
  if (!R.services[name]) R.services[name] = { pass: 0, fail: 0, notes: [] }
  return R.services[name]
}
function check(svc, label, cond, note) {
  const s = service(svc)
  if (cond) { s.pass++; R.pass++ }
  else { s.fail++; R.fail++; s.notes.push(`✗ ${label}${note ? ' — ' + note : ''}`) }
}

const base = new URL('../frontend/src/', import.meta.url)
const svcBase = new URL('../service/agents/', import.meta.url)

// ── 1. Finance model ────────────────────────────────────────────────
{
  const { computeForecast, computeHealth, computeStats, dailySpendSeries, spendTimelineSeries, categorySpendSeries } = await import(new URL('lib/finance.js', base))

  // Forecast must project a change, not copy the balance.
  const fFresh = computeForecast({ balance: 45230, monthlyIncome: 18000, totalFixedExpenses: 0, monthlySpent: 0, monthlyBudget: 8500 })
  check('forecast', 'projects a change on a fresh account', fFresh.predictedMonthEndBalance < 45230)
  check('forecast', 'projected spend > 0', fFresh.projectedRemainingSpend > 0)
  check('forecast', 'savings derived', fFresh.potentialSavings > 0)
  const fEmpty = computeForecast({ balance: 1000 })
  check('forecast', 'no NaN on empty account', Number.isFinite(fEmpty.predictedMonthEndBalance))

  // Health must collapse to red on a deficit.
  const hDef = computeHealth({ balance: 20000, monthlyIncome: 20000, totalFixedExpenses: 38500, monthlySpent: 0, transactions: [] })
  check('health', 'deficit → low score', hDef.score < 40, `got ${hDef.score}`)
  check('health', 'deficit → stage critical', hDef.stage === 'critical')
  check('health', 'deficit flag set', hDef.deficit === true && hDef.surplus < 0)
  const hGood = computeHealth({ balance: 60000, monthlyIncome: 20000, totalFixedExpenses: 4000, monthlySpent: 2000, transactions: [] })
  check('health', 'healthy → high score', hGood.score >= 70, `got ${hGood.score}`)
  const hNoInc = computeHealth({ balance: 5000, monthlyIncome: 0, transactions: [] })
  check('health', 'no income handled', Number.isFinite(hNoInc.score) && hNoInc.flags.includes('no_income'))
  const hFraud = computeHealth({ balance: 20000, monthlyIncome: 20000, totalFixedExpenses: 3000, monthlySpent: 1000, transactions: [{ blocked: true, amount: 5000 }, { blocked: false, amount: 100 }] })
  check('health', 'blocked fraud lowers score', hFraud.score < hGood.score)

  const stats = computeStats([{ amount: 100, blocked: false, beneficiary: 'A', timestamp: 1 }, { amount: 200, blocked: true, beneficiary: 'B', timestamp: 2 }])
  check('stats', 'counts sent/blocked', stats.sentCount === 1 && stats.blockedCount === 1 && stats.totalBlocked === 200)

  // Chart series must be non-empty and consistent even with sparse data.
  const acc = { balance: 45230, monthlyIncome: 18000, totalFixedExpenses: 6000, monthlySpent: 0, monthlyBudget: 8500, transactions: [], fixedExpenses: [{ category: 'rent', amount: 4000 }, { category: 'utilities', amount: 2000 }] }
  const fc = computeForecast(acc)
  const daily = dailySpendSeries(acc, fc)
  check('charts', 'daily series has actual + projected + budget', daily.actual.length >= 1 && daily.projected.length >= 1 && daily.budget > 0 && daily.maxY > 0)
  check('charts', 'projection ends ≥ actual (spend accrues)', daily.projectedTotal >= (daily.actual.at(-1)?.value ?? 0))
  const monthly = spendTimelineSeries(acc, fc)
  check('charts', 'timeline has past+current+future, a peak, finite avg',
    monthly.months.length === 6 &&
    monthly.months.some((m) => m.isCurrent) &&
    monthly.months.some((m) => m.kind === 'future') &&
    monthly.months.some((m) => m.kind === 'past') &&
    monthly.months.some((m) => m.isPeak) &&
    Number.isFinite(monthly.avg) && monthly.avg >= 0)
  check('charts', 'current bar pinned to forecast (fixed + projectedMonthlySpend)',
    monthly.months.find((m) => m.isCurrent)?.total === Math.round(acc.totalFixedExpenses + fc.projectedMonthlySpend))
  check('charts', 'actual+predicted === total for every month',
    monthly.months.every((m) => Math.abs((m.actual + m.predicted) - m.total) <= 1))
  check('charts', 'future months are pure forecast (actual 0)',
    monthly.months.filter((m) => m.kind === 'future').every((m) => m.actual === 0 && m.predicted === m.total))
  const cat = categorySpendSeries(acc.fixedExpenses)
  check('charts', 'category donut totals match', cat.total === 6000 && cat.entries.length === 2)
}

// ── 2. Community registry ───────────────────────────────────────────
{
  const c = await import(new URL('store/community.js', base))
  const st = c.communityStats()
  check('community', 'seed networks present', st.networks >= 3 && st.reports > 0)
  check('community', 'end-user stats: no money figure, has weekly recency', !('protectedAmount' in st) && st.thisWeek >= 1)
  check('community', 'ring (shared mule) detected', c.sharedMules().size >= 1)
  check('community', 'direct lookup works', c.lookupPayee('خالد العتيبي').kind === 'direct')
  check('community', 'linked (mule) lookup works', c.lookupPayee('حساب وسيط ٧٤').kind === 'linked')
  check('community', 'unknown payee not flagged', c.lookupPayee('شخص عادي جدا').found === false)
  const netK = c.lookupPayee('خالد العتيبي').network
  check('community', 'network reasons derived from victims', c.networkReasons(netK, 'ar', 2).length === 2)
  c.reportFraud({ payee: 'محل الاختبار', category: 'marketplace', reason: 'اختبار', amount: 1000 })
  const r = c.lookupPayee('محل الاختبار')
  check('community', 'report → lookup finds it', r.found && r.network.reportCount === 1)
  check('community', 'user report keeps complaint on victim', r.network.victims[0].reason?.ar === 'اختبار' && r.network.victims[0].amount === 1000)
  c.reportFraud({ payee: 'محل الاختبار', reason: 'اختبار 2', amount: 500 })
  check('community', 'repeat report increments count', c.lookupPayee('محل الاختبار').network.reportCount === 2)
  const g = c.buildGraph(netK)
  check('community', 'graph has center + victims + mules', g.nodes[0].role === 'scammer' && g.nodes.length > 3 && g.hasRing)
  const gVictim = g.nodes.find((n) => n.role === 'victim')
  check('community', 'graph victim carries complaint + amount', !!gVictim?.reason && gVictim.amount > 0)
  const gRing = g.nodes.find((n) => n.role === 'ring')
  check('community', 'graph ring node carries explanation note', !!gRing?.note)
}

// ── 2b. In-app assistant app-guide (RAG + intent router) ────────────
{
  const a = await import(new URL('lib/appGuide.js', base))
  check('appGuide', 'transfer intent detected (ar)', a.detectIntent('ابي احول فلوس لشخص', 'ar')?.service.id === 'transfer')
  check('appGuide', 'community intent detected (en)', a.detectIntent('I want to report a scam', 'en')?.service.id === 'community')
  check('appGuide', 'recommendations intent detected (ar)', a.detectIntent('كيف اوفر من راتبي', 'ar')?.service.id === 'recommendations')
  check('appGuide', 'greeting → no intent (avoids false action)', a.detectIntent('مرحبا كيف حالك', 'ar') === null)
  // Informational questions must be ANSWERED by RAG, never hijacked into a nav card.
  check('appGuide', 'ar question not hijacked', a.detectIntent('ما وضع ميزانيتي هذا الشهر؟', 'ar') === null)
  check('appGuide', 'en question not hijacked (budget/transfer nouns)',
    a.detectIntent('How is my budget this month?', 'en') === null && a.detectIntent('how much did I transfer last month', 'en') === null)
  check('appGuide', 'cue+noun request fires', a.detectIntent('افتح الاعدادات', 'ar')?.service.id === 'settings')
  check('appGuide', 'getService resolves route', a.getService('analytics')?.route === '/app/analytics')
  check('appGuide', 'RAG knowledge lists services (ar+en)', a.appKnowledge('ar').includes('/app/community') && a.appKnowledge('en').length > 50)
}

// ── 3. AI agents (short-circuits + graceful fallback) ───────────────
{
  const hasKey = !!process.env.OPENAI_API_KEY
  const { analyze } = await import(new URL('fraudAgent.js', svcBase))
  const { interrogate } = await import(new URL('interrogationAgent.js', svcBase))
  const { recommend } = await import(new URL('recommendAgent.js', svcBase))
  const { chat } = await import(new URL('chatAgent.js', svcBase))

  // fraudAgent deterministic short-circuits (no network)
  const known = await analyze({ isPersonallyKnown: true, amount: 1000 })
  check('fraudAgent', 'known person → allow/low', known.recommendation === 'allow' && known.riskScore <= 10)
  const forced = await analyze({ forceHighRisk: true, amount: 5000, reason: 'crypto' })
  check('fraudAgent', 'forceHighRisk → block', forced.recommendation === 'block' && forced.riskScore >= 80)

  // interrogation deterministic short-circuits
  const prev = await interrogate({ beneficiary: 'متجر', amount: 4000, conversationHistory: [], previousTransfers: [{ amount: 1 }] })
  check('interrogation', 'prior transfer → skipRisk', prev.skipRisk === true)
  const crypto = await interrogate({ beneficiary: 'x', amount: 5000, conversationHistory: [{ role: 'assistant', content: 'ما سبب هذه الحوالة؟' }, { role: 'user', content: 'استثمار بيتكوين مضمون' }], previousTransfers: [] })
  check('interrogation', 'crypto answer → forceHighRisk', crypto.forceHighRisk === true)
  const gift = await interrogate({ beneficiary: 'x', amount: 100, conversationHistory: [{ role: 'assistant', content: 'q' }, { role: 'user', content: 'اشتري بطاقة ايتونز وارسل الارقام' }], previousTransfers: [] })
  check('interrogation', 'gift-card under 300 → block (not tiny-amount pass)', gift.forceHighRisk === true)
  const fam = await interrogate({ beneficiary: 'أخي', amount: 1000, conversationHistory: [{ role: 'assistant', content: 'q' }, { role: 'user', content: 'مصروف لأخوي' }], previousTransfers: [] })
  check('interrogation', 'family → known person', fam.isPersonallyKnown === true)

  if (!hasKey) {
    // Without a key: recommend degrades to an empty list (client then uses its
    // local heuristic); chat throws AiNotConfiguredError so the route returns
    // 503 and the UI shows a specific "add your key" CTA. Both are correct.
    const rec = await recommend({ accountData: { balance: 1000, monthlyIncome: 5000, lang: 'ar' } })
    check('recommend', 'no key → empty list (client falls back)', Array.isArray(rec.recommendations) && rec.recommendations.length === 0)
    let chatSignalledKey = false
    try {
      await chat({ messages: [{ role: 'user', content: 'مرحبا' }], accountData: { balance: 1000, lang: 'ar' } })
    } catch (e) {
      chatSignalledKey = e?.name === 'AiNotConfiguredError'
    }
    check('chat', 'no key → AiNotConfiguredError (→ 503 → UI "add key")', chatSignalledKey)
    service('recommend').notes.push('ℹ set OPENAI_API_KEY to exercise the live model')
  } else {
    try {
      const rec = await recommend({ accountData: { balance: 45230, monthlyIncome: 18000, totalFixedExpenses: 6000, monthlySpent: 5000, monthlyBudget: 8500, lang: 'ar', forecast: { projectedMonthlySpend: 9116, overspending: true, dailyBurn: 294 } } })
      check('recommend', 'live model returns recommendations', Array.isArray(rec.recommendations) && rec.recommendations.length > 0)
      check('recommend', 'recs have quantified fields', rec.recommendations.every((r) => 'impact' in r && r.category && r.title))
    } catch (e) { check('recommend', 'live model call', false, e.message) }
    try {
      const rep = await chat({ messages: [{ role: 'user', content: 'كيف سينتهي شهري مالياً؟' }], accountData: { balance: 45230, monthlyIncome: 18000, lang: 'ar', forecast: { predictedMonthEndBalance: 41000 } } })
      check('chat', 'live model replies', typeof rep === 'string' && rep.length > 0)
    } catch (e) { check('chat', 'live model call', false, e.message) }
  }
}

// ── Report ──────────────────────────────────────────────────────────
console.log('\n══════════ Tahseen service review ══════════')
for (const [name, s] of Object.entries(R.services)) {
  const status = s.fail === 0 ? '✅ OK  ' : '❌ FAIL'
  console.log(`${status}  ${name.padEnd(16)} ${s.pass}/${s.pass + s.fail} checks`)
  for (const n of s.notes) console.log(`        ${n}`)
}
console.log('────────────────────────────────────────────')
console.log(`TOTAL: ${R.pass} passed, ${R.fail} failed`)
console.log('════════════════════════════════════════════\n')
process.exit(R.fail === 0 ? 0 : 1)
