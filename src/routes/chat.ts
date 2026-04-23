import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { buildSystemPrompt } from '../prompts/chat.js'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatBody {
  messages: ChatMessage[]
  nativeLang: string
  learningLangs: string[]
  activeLang: string
}

export const chatRoute = new Hono()

chatRoute.post('/', async (c) => {
  const body = await c.req.json<ChatBody>()
  const { messages, nativeLang, learningLangs, activeLang } = body

  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY! })

  return streamSSE(c, async (stream) => {
    try {
      const { fullStream } = streamText({
        model: google('gemini-2.5-flash'),
        system: buildSystemPrompt(nativeLang, learningLangs, activeLang),
        messages,
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
