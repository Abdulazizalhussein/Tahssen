// ─────────────────────────────────────────────────────────────────
//  Tahseen API client — all AI calls go through the backend proxy
//  Dev: Vite proxy forwards /api → http://localhost:3001
//  Prod: same origin (backend serves frontend/dist statically)
// ─────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_BASE || ''

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
}

export async function apiInterrogate({ beneficiary, amount, conversationHistory, previousTransfers }) {
  return post('/api/ai/interrogate', { beneficiary, amount, conversationHistory, previousTransfers })
}

export async function apiAnalyze(params) {
  return post('/api/ai/analyze', params)
}

export async function apiChat(messages, accountData) {
  const d = await post('/api/ai/chat', { messages, accountData })
  return d.reply
}

export async function apiHealth() {
  const r = await fetch(`${BASE}/api/health`)
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
}
