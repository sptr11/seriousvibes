import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import authRoutes from './routes/auth.js'
import workspaceRoutes from './routes/workspaces.js'
import { log } from './lib/logger.js'
import type { AppVariables } from './types.js'

type Env = { Variables: AppVariables }

export const app = new Hono<Env>()

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  log.info('request', {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms: Date.now() - start,
  })
})

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

app.get('/health', c =>
  c.json({ ok: true, uptime: Math.floor(process.uptime()) }),
)

app.route('/api/auth', authRoutes)
app.route('/api/workspaces', workspaceRoutes)

app.onError((err, c) => {
  const message = err instanceof Error ? err.message : 'Internal error'
  log.error('unhandled error', {
    method: c.req.method,
    path: c.req.path,
    message,
  })
  return c.json({ error: 'Internal error' }, 500)
})

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'

if (!isTest) {
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.JWT_SECRET
    if (!secret || secret === 'change-me-to-a-32-byte-random-string') {
      log.error('JWT_SECRET is not set or is the default value — refusing to start')
      process.exit(1)
    }
  }

  const port = Number(process.env.API_PORT ?? 3001)
  serve({ fetch: app.fetch, port }, info => {
    log.info(`listening on http://localhost:${info.port}`, { port: info.port })
  })
}
