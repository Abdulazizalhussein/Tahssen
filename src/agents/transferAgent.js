import { getClient, MODEL } from './client'

const SYSTEM = `You are Tahseen, an AI financial protection agent for Alinma Bank.
You are interrogating a user about a transfer they want to make, to detect fraud or
social-engineering before money leaves their account.

Ask ONE focused question at a time, in Arabic primarily. Start with the reason for the
transfer, then probe based on their answers (e.g. whether they know the beneficiary
personally, whether they were asked/pressured to send it, how they got the IBAN).
If the beneficiary is new (not in their transfer history), be more thorough.

Gather enough context in 2-3 exchanges, then stop. When you have enough to hand off to
the risk engine, set "done": true and stop asking questions.

Always respond with ONLY valid JSON: {"question": "<next question or empty>", "done": <boolean>}.`

export async function nextQuestion(
  apiKey,
  { beneficiary, amount, iban, isNewBeneficiary, history = [] }
) {
  const client = getClient(apiKey)

  const messages = [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: JSON.stringify({
        transfer: { beneficiary, amount: Number(amount), iban: iban || null },
        isNewBeneficiary,
        conversationSoFar: history,
        instruction:
          history.length === 0
            ? 'Begin the interrogation with your first question.'
            : 'Decide the next question, or set done=true if you have enough context.',
      }),
    },
  ]

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    messages,
    response_format: { type: 'json_object' },
  })

  const parsed = JSON.parse(response.choices[0].message.content)
  return {
    question: typeof parsed.question === 'string' ? parsed.question.trim() : '',
    done: !!parsed.done,
  }
}
