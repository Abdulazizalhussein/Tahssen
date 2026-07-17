// ─────────────────────────────────────────────────────────────────
//  Tahseen Community Protection registry.
//
//  A shared fraud-report registry with relationship graphs. Users report
//  a payee as fraudulent (with a reason); anyone about to transfer to a
//  reported payee is warned, and the money-flow graph (victims in, mules
//  out) reveals the wider fraud ring.
//
//  DEMO NOTE: there is no cross-user backend, so the seed below stands in
//  for "reports from other Tahseen users" and the current user's reports
//  join it in localStorage. In production this would be a shared registry
//  (e.g. a KV/DB service) keyed by hashed IBAN. See AGENTS.md.
// ─────────────────────────────────────────────────────────────────

const STORE_KEY = 'tahseen.community.v1'

/** Arabic-aware normalization for fuzzy name/IBAN matching. */
export function normName(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '') // diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const normIban = (s) => (s || '').toString().replace(/\s+/g, '').toUpperCase()

// A shared mule name that appears across networks reveals a ring.
const RING_MULE = 'حساب وسيط ٧٤'

// Money-mule note: mules receive money from victims and immediately move it on
// (out to another account or abroad) — the laundering hop.
const MULE_NOTE = { ar: 'حساب وسيط يستلم الأموال ويحوّلها فوراً للخارج', en: 'A relay account that receives money and forwards it out immediately' }
const RING_NOTE = { ar: 'حساب وسيط ظهر في أكثر من عملية احتيال — دليل على شبكة منظّمة', en: 'A relay account seen across multiple scams — evidence of an organized ring' }

const SEED = [
  {
    id: 'seed_invest',
    payee: 'خالد العتيبي',
    iban: 'SA4420000001234567891234',
    category: 'investment',
    city: 'الرياض',
    daysAgo: 4,
    reportCount: 9,
    victims: [
      { name: 'ع. الشهري', amount: 12000, city: 'الرياض', reason: { ar: 'وعدني بمضاعفة المبلغ خلال أسبوع ثم اختفى', en: 'Promised to double my money in a week, then vanished' } },
      { name: 'م. القحطاني', amount: 8000, city: 'جدة', reason: { ar: 'طلب رسوماً إضافية لسحب أرباحي ولم أستلم شيئاً', en: 'Demanded extra fees to release my profits — I got nothing' } },
      { name: 'س. الدوسري', amount: 25000, city: 'الدمام', reason: { ar: 'أقنعني بمنصة تداول وهمية وحوّلت مبلغاً كبيراً', en: 'Talked me into a fake trading platform; I sent a large amount' } },
      { name: 'ف. الحربي', amount: 5000, city: 'الرياض', reason: { ar: 'عرض أرباحاً يومية مضمونة ثم حظرني', en: 'Offered guaranteed daily returns, then blocked me' } },
      { name: 'ن. الغامدي', amount: 15000, city: 'مكة', reason: { ar: 'تظاهر بأنه مستشار استثمار معتمد', en: 'Pretended to be a licensed investment advisor' } },
    ],
    mules: [
      { name: RING_MULE, amount: 40000, note: RING_NOTE },
      { name: 'محفظة رقمية خارجية', amount: 25000, note: MULE_NOTE },
    ],
  },
  {
    id: 'seed_market',
    payee: 'متجر العروض الذهبية',
    iban: 'SA1130000009876543210001',
    category: 'marketplace',
    city: 'جدة',
    daysAgo: 9,
    reportCount: 6,
    victims: [
      { name: 'ر. الزهراني', amount: 1800, city: 'جدة', reason: { ar: 'دفعت ثمن جوال ولم يصلني وحظرني بعد الدفع', en: 'Paid for a phone, never arrived, blocked after payment' } },
      { name: 'ت. المطيري', amount: 3200, city: 'الرياض', reason: { ar: 'استلم قيمة الطلب ولم يشحن المنتج', en: 'Took the order amount and never shipped' } },
      { name: 'ل. العمري', amount: 950, city: 'أبها', reason: { ar: 'أرسل رقم تتبع وهمي', en: 'Sent a fake tracking number' } },
      { name: 'ك. السبيعي', amount: 4500, city: 'جدة', reason: { ar: 'طلب المبلغ كاملاً مقدماً ثم اختفى', en: 'Asked for full payment upfront, then disappeared' } },
    ],
    // Shares RING_MULE with the investment scam → same laundering ring.
    mules: [{ name: RING_MULE, amount: 9000, note: RING_NOTE }],
  },
  {
    id: 'seed_impersonation',
    payee: 'أبو محمد - الدعم',
    iban: 'SA6620000005555444433221',
    category: 'impersonation',
    city: 'الدمام',
    daysAgo: 2,
    reportCount: 4,
    victims: [
      { name: 'ح. البلوي', amount: 9000, city: 'تبوك', reason: { ar: 'انتحل صفة موظف بنك وطلب تحويلاً «للتحقق»', en: 'Posed as a bank officer and asked for a "verification" transfer' } },
      { name: 'و. الأنصاري', amount: 13000, city: 'الدمام', reason: { ar: 'أرسل رابطاً وطلب تحويل الرصيد لحماية الحساب', en: 'Sent a link and asked me to move my balance to "protect" it' } },
    ],
    mules: [{ name: 'سحب صرّاف فوري', amount: 20000, note: { ar: 'يُسحب فوراً عبر الصرّاف الآلي فور وصول المبلغ', en: 'Withdrawn at an ATM the moment the money lands' } }],
  },
]

function loadUser() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveUser(list) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list))
  } catch { /* ignore quota */ }
}

/** All networks (seed + user-reported), user reports first so they surface. */
export function getNetworks() {
  return [...loadUser(), ...SEED]
}

const totalIn = (n) => n.victims.reduce((s, v) => s + (Number(v.amount) || 0), 0)

/** Mule names that appear in more than one network (a shared laundering hop). */
export function sharedMules(networks = getNetworks()) {
  const seen = new Map()
  for (const n of networks) for (const m of n.mules || []) {
    const k = normName(m.name)
    seen.set(k, (seen.get(k) || 0) + 1)
  }
  return new Set([...seen.entries()].filter(([, c]) => c > 1).map(([k]) => k))
}

export function communityStats() {
  const nets = getNetworks()
  const reports = nets.reduce((s, n) => s + (n.reportCount || 1), 0)
  const victims = nets.reduce((s, n) => s + n.victims.length, 0)
  const thisWeek = nets.filter((n) => (n.daysAgo ?? 99) <= 7).length
  return { networks: nets.length, reports, victims, thisWeek }
}

/**
 * Look a payee up in the registry.
 *  - direct: the payee itself has been reported.
 *  - linked: the payee is a mule that received money from a reported scammer
 *    (a 1-hop, indirect caution).
 */
export function lookupPayee(name, iban) {
  const nn = normName(name)
  const ni = normIban(iban)
  if (!nn && !ni) return { found: false }
  const nets = getNetworks()

  const direct = nets.find(
    (n) => (nn && normName(n.payee) === nn) || (ni && normIban(n.iban) === ni)
  )
  if (direct) return { found: true, kind: 'direct', network: direct }

  for (const n of nets) {
    const mule = (n.mules || []).find((m) => normName(m.name) === nn)
    if (mule) return { found: true, kind: 'linked', network: n, via: mule.name }
  }
  return { found: false }
}

/** Add or reinforce a report. Returns the updated/created network. */
export function reportFraud({ payee, iban, category = 'other', reason = '', amount = 0, reporterName = 'أنت' }) {
  const list = loadUser()
  const nn = normName(payee)
  const existing = list.find((n) => normName(n.payee) === nn)
  const reasonObj = reason ? { ar: reason, en: reason } : null
  const victim = { name: reporterName, amount, city: '', reason: reasonObj }

  if (existing) {
    existing.reportCount = (existing.reportCount || 1) + 1
    existing.victims = [victim, ...existing.victims].slice(0, 12)
    existing.daysAgo = 0
    saveUser(list)
    return existing
  }

  const created = {
    id: `user_${nn.replace(/\s+/g, '_')}_${list.length}`,
    payee: payee.trim(),
    iban: normIban(iban),
    category,
    city: '',
    daysAgo: 0,
    reportCount: 1,
    userReported: true,
    victims: [victim],
    mules: [],
  }
  saveUser([created, ...list])
  return created
}

/** Build the nodes + edges for the money-flow graph of one network. Each victim
 *  node carries its complaint + amount; each mule node carries a behavior note. */
export function buildGraph(network) {
  const ring = sharedMules()
  const nodes = [
    { id: 'center', label: network.payee, role: 'scammer', amount: totalIn(network), reportCount: network.reportCount, category: network.category },
  ]
  const edges = []
  network.victims.forEach((v, i) => {
    const id = `v${i}`
    nodes.push({ id, label: v.name, role: 'victim', amount: v.amount, city: v.city, reason: v.reason, side: 'in' })
    edges.push({ from: id, to: 'center', amount: v.amount, dir: 'in' })
  })
  ;(network.mules || []).forEach((m, i) => {
    const id = `m${i}`
    const isRing = ring.has(normName(m.name))
    nodes.push({ id, label: m.name, role: isRing ? 'ring' : 'mule', amount: m.amount, note: m.note, side: 'out' })
    edges.push({ from: 'center', to: id, amount: m.amount, dir: 'out', ring: isRing })
  })
  return { nodes, edges, hasRing: (network.mules || []).some((m) => ring.has(normName(m.name))) }
}

/** Top complaints for a network (from its victims), for the card summary. */
export function networkReasons(network, lang = 'ar', limit = 2) {
  return (network.victims || [])
    .map((v) => v.reason)
    .filter(Boolean)
    .slice(0, limit)
    .map((r) => (lang === 'en' ? r.en || r.ar : r.ar))
}

export const CATEGORIES = ['investment', 'marketplace', 'impersonation', 'phishing', 'romance', 'job', 'other']
