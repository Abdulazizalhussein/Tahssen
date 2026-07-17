import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { existsSync } from 'fs'
import aiRouter from './routes/ai.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

// Behind Vercel/other proxies, trust the forwarded client IP for rate limiting.
app.set('trust proxy', 1)

// ── CORS ────────────────────────────────────────────────────────────
// In production the SPA is served from the same origin, so no CORS is needed.
// An explicit allowlist can be set via CORS_ORIGINS (comma-separated). If it is
// unset we allow same-origin/no-origin requests and reflect nothing else.
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean)
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true)                 // same-origin / curl / server-to-server
    if (CORS_ORIGINS.length === 0) return cb(null, true) // no allowlist configured → dev-friendly
    return cb(null, CORS_ORIGINS.includes(origin))
  },
}))

// Minimal security headers (avoids a helmet dependency).
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')
  next()
})

app.use(express.json({ limit: '1mb' }))

// ── Lightweight per-IP rate limiter for the AI proxy ────────────────
// The /api/ai/* routes call OpenAI (real cost). This caps abuse without a
// dependency. On serverless it is per-instance, which still throttles a hot
// instance; on the single-server deploy it is a true global limit.
const RL_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000)
const RL_MAX = Number(process.env.RATE_LIMIT_MAX || 30)
const hits = new Map() // ip → { count, resetAt }
function rateLimit(req, res, next) {
  const now = Date.now()
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown'
  let rec = hits.get(ip)
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + RL_WINDOW_MS }
    hits.set(ip, rec)
  }
  rec.count += 1
  if (rec.count > RL_MAX) {
    const retry = Math.ceil((rec.resetAt - now) / 1000)
    res.setHeader('Retry-After', String(retry))
    return res.status(429).json({ error: 'RATE_LIMITED', retryAfterSeconds: retry })
  }
  // Opportunistic cleanup so the map can't grow unbounded.
  if (hits.size > 5000) for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k)
  next()
}

// API routes (rate-limited)
app.use('/api', rateLimit, aiRouter)

// Static frontend — only mount when dist exists (i.e. after a build).
// On Vercel the CDN serves the static build instead, so this stays local-only.
const frontendDist = join(__dirname, '../frontend/dist')
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist))

  // SPA fallback: serve index.html for non-/api GET requests
  app.get(/^(?!\/api).*$/, (_req, res) => {
    res.sendFile(join(frontendDist, 'index.html'))
  })
}

export default app
