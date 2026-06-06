// ─────────────────────────────────────────────────────────────────
//  Tahseen Proxy Client — routes all AI calls through Vercel proxy
//  No OpenAI key needed on the device.
// ─────────────────────────────────────────────────────────────────

const PROXY_BASE = 'https://tahseen-api.vercel.app'
const SECRET = 'tahseen_secure_2025_xK9mP'

async function proxyPost(path, body) {
  const r = await fetch(`${PROXY_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tahseen-secret': SECRET,
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`Proxy ${r.status}: ${text}`)
  }
  return r.json()
}

/** Maps to /api/ai/interrogate — returns the same shape as getNextQuestion */
export async function proxyInterrogate({ beneficiary, amount, conversationHistory, previousTransfers }) {
  return proxyPost('/api/ai/interrogate', { beneficiary, amount, conversationHistory, previousTransfers })
}

/** Maps to /api/ai/analyze — returns the same shape as analyzeTransfer */
export async function proxyAnalyze(params) {
  return proxyPost('/api/ai/analyze', params)
}

/** Maps to /api/ai/chat — returns the assistant reply string */
export async function proxyChat({ messages, accountData }) {
  const d = await proxyPost('/api/ai/chat', { messages, accountData })
  return d.reply || ''
}
