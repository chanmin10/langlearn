import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { bearerAuth } from './middleware/auth.js'
import { wordLookupRoute } from './routes/wordLookup.js'
import { chatRoute } from './routes/chat.js'
import { generateCardsRoute } from './routes/generateCards.js'

const app = new Hono()

app.use('/api/*', bearerAuth())

app.route('/api/word-lookup', wordLookupRoute)
app.route('/api/chat', chatRoute)
app.route('/api/generate-cards', generateCardsRoute)

app.get('/health', (c) => c.json({ ok: true }))

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`)
})
