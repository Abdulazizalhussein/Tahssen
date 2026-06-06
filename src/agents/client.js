import OpenAI from 'openai'

export class MissingApiKeyError extends Error {
  constructor() {
    super('MISSING_API_KEY')
    this.code = 'MISSING_API_KEY'
  }
}

export function getClient(apiKey) {
  if (!apiKey) throw new MissingApiKeyError()
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
}

export const MODEL = 'gpt-4o-mini'
