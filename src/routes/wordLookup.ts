import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { buildWordLookupSystemPrompt } from '../prompts/wordLookup.js'

const LANG_NAMES: Record<string, string> = {
  ko: 'Korean',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  ja: 'Japanese',
  zh: 'Chinese'
}

interface WordLookupBody {
  input: string
  nativeLang: string
  activeLang: string
}

export const wordLookupRoute = new Hono()

wordLookupRoute.post('/', async (c) => {
  const body = await c.req.json<WordLookupBody>()
  const { input, nativeLang, activeLang } = body

  const nativeName = LANG_NAMES[nativeLang] ?? nativeLang
  const activeName = LANG_NAMES[activeLang] ?? activeLang
  const wordCount = input.trim().split(/\s+/).length

  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY! })

  return streamSSE(c, async (stream) => {
    try {
      const { fullStream } = streamText({
        model: google('gemini-2.5-flash'),
        system: buildWordLookupSystemPrompt(nativeName, activeName, wordCount),
        messages: [{ role: 'user', content: input }],
        maxTokens: 2000,
        temperature: 0,
        maxRetries: 0
      })

      for await (const part of fullStream) {
        if (part.type === 'text-delta') {
          await stream.writeSSE({ data: part.textDelta })
        } else if (part.type === 'error') {
          throw part.error
        }
      }
      await stream.writeSSE({ data: '[DONE]' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await stream.writeSSE({ data: `[ERROR] ${msg}` })
    }
  })
})
