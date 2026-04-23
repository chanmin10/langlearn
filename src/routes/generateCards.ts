import { Hono } from 'hono'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'

interface GenerateCardsBody {
  inputText: string
  targetLanguage: string
  nativeLanguage: string
  count?: number
}

interface GenerateCardsResponse {
  cards: Array<{ front: string; back: string }>
}

export const generateCardsRoute = new Hono()

generateCardsRoute.post('/', async (c) => {
  try {
    const body = await c.req.json<GenerateCardsBody>()
    const { inputText, targetLanguage, nativeLanguage, count } = body

    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY! })

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: `You are a language learning assistant. Generate flashcards from the given text.
Return a JSON array of objects with "front" (target language word/phrase) and "back" (translation/explanation).
Return ONLY valid JSON, no markdown.`,
      prompt: `Generate ${count ?? 5} flashcards for learning ${targetLanguage} from this text:
"${inputText}"
Native language: ${nativeLanguage}`
    })

    const cards = JSON.parse(text) as Array<{ front: string; back: string }>
    return c.json<GenerateCardsResponse>({ cards })
  } catch {
    return c.json<GenerateCardsResponse>({ cards: [] }, 500)
  }
})
