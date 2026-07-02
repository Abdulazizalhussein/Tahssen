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
  return new OpenAI()
}
