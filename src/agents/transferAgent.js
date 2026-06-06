import { getClient, MODEL } from './client'

const SYSTEM = `You are Tahseen, an AI financial protection agent for Alinma Bank.
The user is sending money to someone they have already said they do NOT personally know
(not family, friend, or colleague). Your job is to interrogate the PURPOSE of the transfer
to detect fraud or social-engineering before money leaves their account.

Ask ONE focused question at a time, in Arabic primarily. Probe the purpose: why are they
sending it, were they asked or pressured to send it, how did they get the IBAN, is there
any promise of a reward/refund/prize, any urgency or threats.

Gather enough context in 2-3 exchanges, then stop. When you have enough to hand off to the
risk engine, set "done": true and stop asking questions.

Always respond with ONLY valid JSON: {"question": "<next question or empty>", "done": <boolean>}.`

export const RELATIONSHIP_QUESTION =
  'هل تعرف هذا الشخص معرفة شخصية؟ (عائلة، صديق، زميل)'

// Negation / stranger indicators — checked FIRST so "لا أعرفه" (no, I don't know him)
// is treated as unknown even though it contains the substring "أعرفه".
const UNKNOWN_RE =
  /(لا\s*أعرف|لا\s*اعرف|ما\s*أعرف|ما\s*اعرف|غريب|مجهول|don'?t\s*know|do\s*not\s*know|not\s*know|stranger|unknown|\bno\b)/i

// Keywords indicating the beneficiary is personally known to the sender.
const KNOWN_RE =
  /(نعم|أعرفه|اعرفه|أعرفها|اعرفها|عائلة|عائلتي|أهل|اهل|صديق|صديقة|قريب|قريبة|أخي|اخي|أختي|اختي|أبي|ابي|أمي|امي|زوج|زوجة|زميل|زميلة|yes|family|friend|colleague|relative|brother|sister|know him|know her|i know|personal)/i

function isKnownAnswer(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) return false
  if (/^لا([\s،.!؟]|$)/.test(trimmed)) return false
  if (UNKNOWN_RE.test(trimmed)) return false
  return KNOWN_RE.test(trimmed)
}

export async function nextQuestion(
  apiKey,
  { beneficiary, amount, iban, isNewBeneficiary, history = [] }
) {
  // The first question is always the relationship question.
  if (history.length === 0) {
    return { question: RELATIONSHIP_QUESTION, done: false, isPersonallyKnown: false }
  }

  const userMessages = history.filter((m) => m.role === 'user')
  const relationshipAnswer = userMessages[0]?.content || ''

  // Right after the user answers the relationship question, branch.
  if (userMessages.length === 1 && isKnownAnswer(relationshipAnswer)) {
    return { question: '', done: true, isPersonallyKnown: true }
  }

  // Unknown recipient → continue full purpose interrogation via the model.
  const client = getClient(apiKey)

  const messages = [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: JSON.stringify({
        transfer: { beneficiary, amount: Number(amount), iban: iban || null },
        isNewBeneficiary,
        relationshipAnswer,
        conversationSoFar: history,
        instruction: 'Decide the next purpose question, or set done=true if you have enough context.',
      }),
    },
  ]

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    max_tokens: 150,
    messages,
    response_format: { type: 'json_object' },
  })

  const parsed = JSON.parse(response.choices[0].message.content)
  return {
    question: typeof parsed.question === 'string' ? parsed.question.trim() : '',
    done: !!parsed.done,
    isPersonallyKnown: false,
  }
}
