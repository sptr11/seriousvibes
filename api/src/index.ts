import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import authRoutes from './routes/auth.js'
import workspaceRoutes from './routes/workspaces.js'
import type { AppVariables } from './types.js'

type Env = { Variables: AppVariables }

export const app = new Hono<Env>()

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

app.use(
  '*',
  cors({
    origin: origin => {
      if (!origin) return allowedOrigins[0] ?? '*'
      return allowedOrigins.includes(origin) ? origin : null
    },
    credentials: true,
    allowHeaders: ['Authorization', 'Content-Type', 'X-Workspace'],
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  }),
)

app.get('/health', c => c.json({ ok: true }))

app.route('/api/auth', authRoutes)
app.route('/api/workspaces', workspaceRoutes)

app.onError((err, c) => {
  // Never leak internals
  const message = err instanceof Error ? err.message : 'Internal error'
  // Avoid logging tokens/passwords — only log message
  console.error('[api error]', message)
  return c.json({ error: 'Internal error' }, 500)
})

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'

if (!isTest) {
  const port = Number(process.env.API_PORT ?? 3001)
  serve({ fetch: app.fetch, port }, info => {
    console.log(`[api] listening on http://localhost:${info.port}`)
  })
}
