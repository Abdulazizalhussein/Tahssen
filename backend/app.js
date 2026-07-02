import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { existsSync } from 'fs'
import aiRouter from './routes/ai.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// API routes
app.use('/api', aiRouter)

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
