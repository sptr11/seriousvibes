import { Hono } from 'hono'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import type { PoolClient } from 'pg'
import { pool } from '../db/client.js'
import { hashPassword, verifyPassword } from '../auth/passwords.js'
import { signAccessToken } from '../auth/jwt.js'
import {
  clearRefreshCookie,
  generateRefreshToken,
  hashRefreshToken,
  parseRefreshCookie,
  refreshCookie,
  REFRESH_TTL_SECONDS,
} from '../auth/refresh.js'
import { isValidHandle } from '../lib/handle.js'
import { requireAuth } from '../middleware/auth.js'
import type { AppVariables } from '../types.js'

type Env = { Variables: AppVariables }

const auth = new Hono<Env>()

const SignupSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
})

const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
})

function handleFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'user'
  const cleaned = local.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/^-+|-+$/g, '')
  const base = cleaned.length >= 3 ? cleaned.slice(0, 24) : `user-${cleaned}`
  const suffix = randomBytes(2).toString('hex')
  return `${base}-${suffix}`.slice(0, 30)
}

auth.post('/signup', async c => {
  const parsed = SignupSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }
  const { email, password, name } = parsed.data
  const emailLower = email.toLowerCase()

  const existing = (await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [emailLower],
  )) as unknown as { rowCount: number }

  if (existing.rowCount && existing.rowCount > 0) {
    return c.json({ error: 'Email already in use' }, 409)
  }

  const passwordHash = await hashPassword(password)

  let client: PoolClient | null = null
  try {
    client = await pool.connect()
    await client.query('BEGIN')

    const userIns = (await client.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [emailLower, passwordHash, name],
    )) as unknown as { rows: Array<{ id: string; email: string; name: string }> }
    const userRow = userIns.rows[0]
    if (!userRow) throw new Error('User insert returned no row')

    const handle = handleFromEmail(emailLower)
    const wsIns = (await client.query(
      `INSERT INTO workspaces (handle, name)
       VALUES ($1, $2)
       RETURNING id, handle, name, status`,
      [handle, `${name}'s Workspace`],
    )) as unknown as {
      rows: Array<{ id: string; handle: string; name: string; status: 'active' | 'suspended' }>
    }
    const wsRow = wsIns.rows[0]
    if (!wsRow) throw new Error('Workspace insert returned no row')

    await client.query(
      `INSERT INTO memberships (user_id, workspace_id, role) VALUES ($1, $2, 'owner')`,
      [userRow.id, wsRow.id],
    )

    await client.query(
      `INSERT INTO api_keys (workspace_id, created_by, label) VALUES ($1, $2, 'Default')`,
      [wsRow.id, userRow.id],
    )

    const { raw, hash } = generateRefreshToken()
    const tokenId = `rt_${randomBytes(8).toString('hex')}`
    await client.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::interval)`,
      [tokenId, userRow.id, hash, String(REFRESH_TTL_SECONDS)],
    )

    await client.query('COMMIT')

    const accessToken = await signAccessToken(userRow.id)

    c.header('Set-Cookie', refreshCookie(raw))
    return c.json(
      {
        token: accessToken,
        user: { id: userRow.id, email: userRow.email, name: userRow.name },
        workspace: { id: wsRow.id, handle: wsRow.handle, name: wsRow.name, status: wsRow.status },
      },
      201,
    )
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK') } catch { /* ignore */ }
    }
    const msg = err instanceof Error ? err.message : String(err)
    if (/duplicate key|unique constraint/i.test(msg)) {
      return c.json({ error: 'Email already in use' }, 409)
    }
    return c.json({ error: 'Signup failed' }, 500)
  } finally {
    if (client) client.release()
  }
})

auth.post('/login', async c => {
  const parsed = LoginSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }
  const { email, password } = parsed.data

  const result = (await pool.query(
    `SELECT id, email, password_hash, name FROM users WHERE email = $1`,
    [email.toLowerCase()],
  )) as unknown as {
    rows: Array<{ id: string; email: string; password_hash: string; name: string }>
  }

  const row = result.rows[0]
  if (!row) return c.json({ error: 'Invalid email or password' }, 401)

  const ok = await verifyPassword(password, row.password_hash)
  if (!ok) return c.json({ error: 'Invalid email or password' }, 401)

  const { raw, hash } = generateRefreshToken()
  const tokenId = `rt_${randomBytes(8).toString('hex')}`
  await pool.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::interval)`,
    [tokenId, row.id, hash, String(REFRESH_TTL_SECONDS)],
  )

  const accessToken = await signAccessToken(row.id)
  c.header('Set-Cookie', refreshCookie(raw))
  return c.json({
    token: accessToken,
    user: { id: row.id, email: row.email, name: row.name },
  })
})

auth.post('/refresh', async c => {
  const raw = parseRefreshCookie(c.req.header('Cookie'))
  if (!raw) return c.json({ error: 'No refresh token' }, 401)
  const hash = hashRefreshToken(raw)

  // Atomic delete-and-check: only one concurrent request can consume a token
  const result = (await pool.query(
    `DELETE FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()
     RETURNING id, user_id`,
    [hash],
  )) as unknown as {
    rows: Array<{ id: string; user_id: string }>
  }

  const row = result.rows[0]
  if (!row) return c.json({ error: 'Invalid or expired refresh token' }, 401)
  const { raw: newRaw, hash: newHash } = generateRefreshToken()
  const newId = `rt_${randomBytes(8).toString('hex')}`
  await pool.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::interval)`,
    [newId, row.user_id, newHash, String(REFRESH_TTL_SECONDS)],
  )

  const accessToken = await signAccessToken(row.user_id)
  c.header('Set-Cookie', refreshCookie(newRaw))
  return c.json({ token: accessToken })
})

auth.post('/logout', async c => {
  const raw = parseRefreshCookie(c.req.header('Cookie'))
  if (raw) {
    const hash = hashRefreshToken(raw)
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash])
  }
  c.header('Set-Cookie', clearRefreshCookie())
  return c.json({ ok: true })
})

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(254).optional(),
})

auth.patch('/me', requireAuth, async c => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const parsed = UpdateProfileSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }
  const { name, email } = parsed.data
  if (!name && !email) return c.json({ error: 'Nothing to update' }, 400)

  const fields: string[] = []
  const values: unknown[] = []
  let i = 1
  if (name) { fields.push(`name = $${i++}`); values.push(name) }
  if (email) { fields.push(`email = $${i++}`); values.push(email.toLowerCase()) }
  values.push(user.id)

  try {
    const result = (await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, email, name`,
      values,
    )) as unknown as { rows: Array<{ id: string; email: string; name: string }> }
    const row = result.rows[0]
    if (!row) return c.json({ error: 'User not found' }, 404)
    return c.json({ user: row })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/duplicate key|unique constraint/i.test(msg)) {
      return c.json({ error: 'Email already in use' }, 409)
    }
    return c.json({ error: 'Update failed' }, 500)
  }
})

auth.get('/me', requireAuth, async c => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const result = (await pool.query(
    `SELECT w.id, w.handle, w.name, w.status, m.role
     FROM memberships m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.user_id = $1
     ORDER BY m.created_at ASC`,
    [user.id],
  )) as unknown as {
    rows: Array<{ id: string; handle: string; name: string; status: string; role: string }>
  }

  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    workspaces: result.rows,
  })
})

// Export internal helpers for tests
export { isValidHandle }
export default auth
