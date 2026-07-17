// ─────────────────────────────────────────────────────────────────
//  Tahseen API client — all AI calls go through the backend proxy
//  Dev: Vite proxy forwards /api → http://localhost:3001
//  Prod: same origin (backend serves frontend/dist statically)
// ─────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_BASE || ''
const TIMEOUT_MS = 20000

// A network/HTTP error with a machine-readable `code` so callers can branch
// (e.g. surface an "add your OpenAI key" CTA on AI_NOT_CONFIGURED).
class ApiError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

async function post(path, body) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  let r
  try {
    r = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
  } catch (e) {
    throw new ApiError(e?.name === 'AbortError' ? 'Request timed out' : 'Network error', 'NETWORK')
  } finally {
    clearTimeout(timer)
  }
  if (!r.ok) {
    // Map the backend's 503 AI_NOT_CONFIGURED to a stable code.
    let code = `HTTP_${r.status}`
    try {
      const err = await r.json()
      if (err?.error === 'AI_NOT_CONFIGURED') code = 'MISSING_API_KEY'
      else if (err?.error) code = err.error
    } catch { /* non-JSON error body */ }
    throw new ApiError(`API ${r.status}`, code)
  }
  return r.json()
}

export async function apiInterrogate({ beneficiary, amount, conversationHistory, previousTransfers, lang }) {
  return post('/api/ai/interrogate', { beneficiary, amount, conversationHistory, previousTransfers, lang })
}

export async function apiAnalyze(params) {
  return post('/api/ai/analyze', params)
}

export async function apiChat(messages, accountData) {
  const d = await post('/api/ai/chat', { messages, accountData })
  return d.reply
}

export async function apiRecommend(account, forecast) {
  const accountData = {
    balance: account.balance,
    monthlyIncome: account.monthlyIncome,
    totalFixedExpenses: account.totalFixedExpenses,
    monthlySpent: account.monthlySpent,
    monthlyBudget: account.monthlyBudget,
    fixedExpenses: account.fixedExpenses,
    transactions: account.transactions,
    lang: account.lang,
    forecast, // the deterministic projection so the AI reasons over consistent numbers
  }
  return post('/api/ai/recommend', { accountData })
}

export async function apiHealth() {
  const r = await fetch(`${BASE}/api/health`)
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
}
