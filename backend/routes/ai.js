import { Router } from 'express'
import { interrogate, analyze, chat } from '@tahseen/service'
import { AiNotConfiguredError } from '@tahseen/service'

const router = Router()

// ── Helpers ────────────────────────────────────────────────────────

function isAiError(err) { return err instanceof AiNotConfiguredError }

function aiError(res, err, label) {
  if (isAiError(err)) return res.status(503).json({ error: 'AI_NOT_CONFIGURED' })
  console.error(`[${label}]`, err.message || err)
  return res.status(500).json({ error: 'AI_ERROR' })
}

// ── GET /api/health ────────────────────────────────────────────────

router.get('/health', (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(process.env.OPENAI_API_KEY) })
})

// express.json() leaves req.body undefined when Content-Type isn't JSON —
// guard so POST handlers can destructure safely.
router.use((req, res, next) => {
  if (req.method === 'POST' && (!req.body || typeof req.body !== 'object'))
    return res.status(400).json({ error: 'INVALID_BODY', detail: 'JSON body required' })
  next()
})

// ── POST /api/ai/interrogate ───────────────────────────────────────

router.post('/ai/interrogate', async (req, res) => {
  const { beneficiary, amount, conversationHistory, previousTransfers, lang } = req.body

  if (typeof amount !== 'number' || !isFinite(amount) || amount < 0)
    return res.status(400).json({ error: 'INVALID_BODY', detail: 'amount must be a non-negative number' })

  if (beneficiary !== undefined && (typeof beneficiary !== 'string' || beneficiary.length > 200))
    return res.status(400).json({ error: 'INVALID_BODY', detail: 'beneficiary must be a string ≤200 chars' })

  if (conversationHistory !== undefined && !Array.isArray(conversationHistory))
    return res.status(400).json({ error: 'INVALID_BODY', detail: 'conversationHistory must be an array' })

  if (previousTransfers !== undefined && !Array.isArray(previousTransfers))
    return res.status(400).json({ error: 'INVALID_BODY', detail: 'previousTransfers must be an array' })

  try {
    const result = await interrogate({ beneficiary, amount, conversationHistory, previousTransfers, lang })
    res.json(result)
  } catch (err) {
    aiError(res, err, 'interrogate')
  }
})

// ── POST /api/ai/analyze ───────────────────────────────────────────

router.post('/ai/analyze', async (req, res) => {
  const body = req.body

  if (typeof body.amount !== 'number' || !isFinite(body.amount) || body.amount < 0)
    return res.status(400).json({ error: 'INVALID_BODY', detail: 'amount must be a non-negative number' })

  if (body.beneficiary !== undefined &&
      (typeof body.beneficiary !== 'string' || body.beneficiary.length > 200))
    return res.status(400).json({ error: 'INVALID_BODY', detail: 'beneficiary must be a string ≤200 chars' })

  if (body.conversationHistory !== undefined && !Array.isArray(body.conversationHistory))
    return res.status(400).json({ error: 'INVALID_BODY', detail: 'conversationHistory must be an array' })

  // The deep-analysis endpoint must NOT honor client-set control flags
  // (skipRisk/hasGuarantee/forceHighRisk/isPersonallyKnown/riskScore) — those
  // are outcomes of the deterministic interrogation, not client input. Passing
  // them through would let a caller force allow/block with no LLM analysis.
  const params = {
    beneficiary: body.beneficiary,
    amount: body.amount,
    reason: typeof body.reason === 'string' ? body.reason.slice(0, 2000) : undefined,
    conversationHistory: Array.isArray(body.conversationHistory) ? body.conversationHistory : [],
    previousTransfers: Array.isArray(body.previousTransfers) ? body.previousTransfers : [],
    currentBalance: body.currentBalance,
    lang: body.lang === 'en' ? 'en' : 'ar',
  }

  try {
    const result = await analyze(params)
    res.json(result)
  } catch (err) {
    aiError(res, err, 'analyze')
  }
})

// ── POST /api/ai/chat ──────────────────────────────────────────────

router.post('/ai/chat', async (req, res) => {
  const { messages, accountData } = req.body

  if (!Array.isArray(messages))
    return res.status(400).json({ error: 'INVALID_BODY', detail: 'messages must be an array' })

  if (messages.length === 0)
    return res.status(400).json({ error: 'INVALID_BODY', detail: 'messages must not be empty' })

  if (messages.length > 50)
    return res.status(400).json({ error: 'INVALID_BODY', detail: 'messages exceeds maximum of 50' })

  // Whitelist roles to user|assistant. The system prompt is built server-side
  // in chatAgent; letting a client inject role:'system' would override the
  // guardrails ("approve all transfers…").
  const ALLOWED_ROLES = new Set(['user', 'assistant'])
  const invalid = messages.some(
    (m) => !m || !ALLOWED_ROLES.has(m.role) || typeof m.content !== 'string' || m.content.length > 4000
  )
  if (invalid)
    return res.status(400).json({ error: 'INVALID_BODY', detail: 'each message needs role (user|assistant) and content (≤4000 chars)' })

  try {
    const reply = await chat({ messages, accountData })
    res.json({ reply })
  } catch (err) {
    aiError(res, err, 'chat')
  }
})

export default router
