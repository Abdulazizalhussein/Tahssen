import OpenAI from 'openai'

export const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

export class AiNotConfiguredError extends Error {
  constructor() {
    super('OPENAI_API_KEY is not set')
    this.name = 'AiNotConfiguredError'
  }
}

export function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new AiNotConfiguredError()
  }
  // Bound latency and retries so a hung provider can't tie up a serverless
  // invocation (Vercel would otherwise 504 after its own limit).
  return new OpenAI({
    timeout: Number(process.env.OPENAI_TIMEOUT_MS || 15000),
    maxRetries: 1,
  })
}
