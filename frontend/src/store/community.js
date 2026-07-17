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

const SEED = [
  {
    id: 'seed_invest',
    payee: 'خالد العتيبي',
    iban: 'SA4420000001234567891234',
    category: 'investment',
    city: 'الرياض',
    daysAgo: 4,
    reportCount: 9,
    reasons: [
      { ar: 'وعدني بأرباح مضمونة في التداول ثم اختفى', en: 'Promised guaranteed trading profits then vanished' },
      { ar: 'طلب رسوماً إضافية لسحب الأرباح', en: 'Asked for extra fees to withdraw the profits' },
    ],
    victims: [
      { name: 'ع. الشهري', amount: 12000, city: 'الرياض' },
      { name: 'م. القحطاني', amount: 8000, city: 'جدة' },
      { name: 'س. الدوسري', amount: 25000, city: 'الدمام' },
      { name: 'ف. الحربي', amount: 5000, city: 'الرياض' },
      { name: 'ن. الغامدي', amount: 15000, city: 'مكة' },
    ],
    mules: [
      { name: RING_MULE, amount: 40000 },
      { name: 'محفظة رقمية خارجية', amount: 25000 },
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
    reasons: [
      { ar: 'استلم قيمة الطلب ولم يشحن المنتج', en: 'Took the payment and never shipped the order' },
      { ar: 'حظرني مباشرة بعد الدفع', en: 'Blocked me right after payment' },
    ],
    victims: [
      { name: 'ر. الزهراني', amount: 1800, city: 'جدة' },
      { name: 'ت. المطيري', amount: 3200, city: 'الرياض' },
      { name: 'ل. العمري', amount: 950, city: 'أبها' },
      { name: 'ك. السبيعي', amount: 4500, city: 'جدة' },
    ],
    // Shares the RING_MULE with the investment scam → same laundering ring.
    mules: [{ name: RING_MULE, amount: 9000 }],
  },
  {
    id: 'seed_impersonation',
    payee: 'أبو محمد - الدعم',
    iban: 'SA6620000005555444433221',
    category: 'impersonation',
    city: 'الدمام',
    daysAgo: 2,
    reportCount: 4,
    reasons: [
      { ar: 'انتحل صفة موظف بنك وطلب تحويلاً للتحقق', en: 'Posed as a bank officer and asked for a "verification" transfer' },
    ],
    victims: [
      { name: 'ح. البلوي', amount: 9000, city: 'تبوك' },
      { name: 'و. الأنصاري', amount: 13000, city: 'الدمام' },
    ],
    mules: [{ name: 'سحب صرّاف فوري', amount: 20000 }],
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
  const protectedAmount = nets.reduce((s, n) => s + totalIn(n), 0)
  const victims = nets.reduce((s, n) => s + n.victims.length, 0)
  return { networks: nets.length, reports, protectedAmount, victims }
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
  const reasonObj = { ar: reason, en: reason }

  if (existing) {
    existing.reportCount = (existing.reportCount || 1) + 1
    if (reason) existing.reasons = [reasonObj, ...(existing.reasons || [])].slice(0, 5)
    if (amount > 0) existing.victims = [{ name: reporterName, amount, city: '' }, ...existing.victims].slice(0, 12)
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
    reasons: reason ? [reasonObj] : [],
    victims: amount > 0 ? [{ name: reporterName, amount, city: '' }] : [{ name: reporterName, amount: 0, city: '' }],
    mules: [],
  }
  saveUser([created, ...list])
  return created
}

/** Build the nodes + edges for the money-flow graph of one network. */
export function buildGraph(network) {
  const ring = sharedMules()
  const nodes = [
    { id: 'center', label: network.payee, role: 'scammer', amount: totalIn(network), reportCount: network.reportCount },
  ]
  const edges = []
  network.victims.forEach((v, i) => {
    const id = `v${i}`
    nodes.push({ id, label: v.name, role: 'victim', amount: v.amount, city: v.city, side: 'in' })
    edges.push({ from: id, to: 'center', amount: v.amount, dir: 'in' })
  })
  ;(network.mules || []).forEach((m, i) => {
    const id = `m${i}`
    const isRing = ring.has(normName(m.name))
    nodes.push({ id, label: m.name, role: isRing ? 'ring' : 'mule', amount: m.amount, side: 'out' })
    edges.push({ from: 'center', to: id, amount: m.amount, dir: 'out', ring: isRing })
  })
  return { nodes, edges, hasRing: (network.mules || []).some((m) => ring.has(normName(m.name))) }
}

export const CATEGORIES = ['investment', 'marketplace', 'impersonation', 'phishing', 'romance', 'job', 'other']
