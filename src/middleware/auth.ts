import type { MiddlewareHandler } from 'hono'

export function bearerAuth(): MiddlewareHandler {
  const secret = process.env.APP_SECRET_KEY
  if (!secret) throw new Error('APP_SECRET_KEY is not set')

  return async (c, next) => {
    const header = c.req.header('Authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (token !== secret) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    await next()
  }
}
