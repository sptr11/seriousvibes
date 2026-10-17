import { Hono } from 'hono'
import { z } from 'zod'
import { pool } from '../db/client.js'
import { requireAuth } from '../middleware/auth.js'
import { isValidHandle } from '../lib/handle.js'
import { generateApiKey } from '../auth/api-keys.js'
import type { AppVariables, Role } from '../types.js'

type Env = { Variables: AppVariables }

const workspaces = new Hono<Env>()

workspaces.use('*', requireAuth)

const CreateSchema = z.object({
  handle: z.string().min(3).max(30),
  name: z.string().min(1).max(100),
})

const UpdateSchema = z.object({
  handle: z.string().min(3).max(30).optional(),
  name: z.string().min(1).max(100).optional(),
})

const AddMemberSchema = z.object({
  email: z.string().email().max(254),
  role: z.enum(['owner', 'admin', 'member']),
})

function canManage(role: Role | 'api_key'): boolean {
  return role === 'owner' || role === 'admin'
}

// GET /api/workspaces — list user's workspaces
workspaces.get('/', async c => {
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
    rows: Array<{ id: string; handle: string; name: string; status: string; role: Role }>
  }

  return c.json({ workspaces: result.rows })
})

// POST /api/workspaces
workspaces.post('/', async c => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const parsed = CreateSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }
  const { handle, name } = parsed.data

  if (!isValidHandle(handle)) {
    return c.json({ error: 'Invalid handle' }, 400)
  }

  const existing = (await pool.query(
    `SELECT id FROM workspaces WHERE handle = $1`,
    [handle],
  )) as unknown as { rowCount: number }
  if (existing.rowCount && existing.rowCount > 0) {
    return c.json({ error: 'Handle already taken' }, 409)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const wsIns = (await client.query(
      `INSERT INTO workspaces (handle, name)
       VALUES ($1, $2)
       RETURNING id, handle, name, status`,
      [handle, name],
    )) as unknown as {
      rows: Array<{ id: string; handle: string; name: string; status: 'active' | 'suspended' }>
    }
    const ws = wsIns.rows[0]
    if (!ws) throw new Error('Workspace insert failed')

    await client.query(
      `INSERT INTO memberships (user_id, workspace_id, role) VALUES ($1, $2, 'owner')`,
      [user.id, ws.id],
    )

    await client.query('COMMIT')
    return c.json({ workspace: ws }, 201)
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* ignore */ }
    const msg = err instanceof Error ? err.message : String(err)
    if (/duplicate key|unique constraint/i.test(msg)) {
      return c.json({ error: 'Handle already taken' }, 409)
    }
    return c.json({ error: 'Workspace creation failed' }, 500)
  } finally {
    client.release()
  }
})

// GET /api/workspaces/:id
workspaces.get('/:id', async c => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')

  const result = (await pool.query(
    `SELECT w.id, w.handle, w.name, w.status, m.role
     FROM memberships m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.user_id = $1 AND (w.id = $2 OR w.handle = $2)
     LIMIT 1`,
    [user.id, id],
  )) as unknown as {
    rows: Array<{ id: string; handle: string; name: string; status: string; role: Role }>
  }

  const row = result.rows[0]
  if (!row) return c.json({ error: 'Workspace not found' }, 404)
  if (row.status === 'suspended') return c.json({ error: 'Workspace suspended' }, 403)
  return c.json({ workspace: row })
})

// PATCH /api/workspaces/:id
workspaces.patch('/:id', async c => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')

  const parsed = UpdateSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }
  const { handle, name } = parsed.data
  if (!handle && !name) return c.json({ error: 'Nothing to update' }, 400)
  if (handle && !isValidHandle(handle)) return c.json({ error: 'Invalid handle' }, 400)

  const memResult = (await pool.query(
    `SELECT m.role, w.id
     FROM memberships m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.user_id = $1 AND (w.id = $2 OR w.handle = $2)
     LIMIT 1`,
    [user.id, id],
  )) as unknown as { rows: Array<{ role: Role; id: string }> }

  const mem = memResult.rows[0]
  if (!mem) return c.json({ error: 'Workspace not found' }, 404)
  if (!canManage(mem.role)) return c.json({ error: 'Forbidden' }, 403)

  const fields: string[] = []
  const values: unknown[] = []
  let i = 1
  if (handle) { fields.push(`handle = $${i++}`); values.push(handle) }
  if (name) { fields.push(`name = $${i++}`); values.push(name) }
  values.push(mem.id)

  try {
    const upd = (await pool.query(
      `UPDATE workspaces SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, handle, name, status`,
      values,
    )) as unknown as {
      rows: Array<{ id: string; handle: string; name: string; status: 'active' | 'suspended' }>
    }
    const row = upd.rows[0]
    if (!row) return c.json({ error: 'Workspace not found' }, 404)
    return c.json({ workspace: row })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/duplicate key|unique constraint/i.test(msg)) {
      return c.json({ error: 'Handle already taken' }, 409)
    }
    return c.json({ error: 'Update failed' }, 500)
  }
})

// DELETE /api/workspaces/:id
workspaces.delete('/:id', async c => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')

  const memResult = (await pool.query(
    `SELECT m.role, w.id AS workspace_id
     FROM memberships m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.user_id = $1 AND (w.id = $2 OR w.handle = $2)
     LIMIT 1`,
    [user.id, id],
  )) as unknown as { rows: Array<{ role: Role; workspace_id: string }> }

  const mem = memResult.rows[0]
  if (!mem) return c.json({ error: 'Workspace not found' }, 404)
  if (mem.role !== 'owner') return c.json({ error: 'Only owners can delete' }, 403)

  const countResult = (await pool.query(
    `SELECT COUNT(*)::int AS n FROM memberships WHERE user_id = $1`,
    [user.id],
  )) as unknown as { rows: Array<{ n: number }> }
  const count = countResult.rows[0]?.n ?? 0
  if (count <= 1) return c.json({ error: 'Cannot delete your last workspace' }, 400)

  await pool.query(`DELETE FROM workspaces WHERE id = $1`, [mem.workspace_id])
  return c.json({ ok: true })
})

// GET /api/workspaces/:id/members
workspaces.get('/:id/members', async c => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')

  const memResult = (await pool.query(
    `SELECT w.id FROM memberships m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.user_id = $1 AND (w.id = $2 OR w.handle = $2) LIMIT 1`,
    [user.id, id],
  )) as unknown as { rows: Array<{ id: string }> }

  const wsRow = memResult.rows[0]
  if (!wsRow) return c.json({ error: 'Workspace not found' }, 404)

  const members = (await pool.query(
    `SELECT u.id, u.email, u.name, m.role, m.created_at
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.workspace_id = $1
     ORDER BY m.created_at ASC`,
    [wsRow.id],
  )) as unknown as {
    rows: Array<{ id: string; email: string; name: string; role: Role; created_at: string }>
  }

  return c.json({ members: members.rows })
})

// POST /api/workspaces/:id/members
workspaces.post('/:id/members', async c => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')

  const parsed = AddMemberSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }
  const { email, role } = parsed.data

  const memResult = (await pool.query(
    `SELECT m.role, w.id AS workspace_id
     FROM memberships m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.user_id = $1 AND (w.id = $2 OR w.handle = $2) LIMIT 1`,
    [user.id, id],
  )) as unknown as { rows: Array<{ role: Role; workspace_id: string }> }

  const mem = memResult.rows[0]
  if (!mem) return c.json({ error: 'Workspace not found' }, 404)
  if (!canManage(mem.role)) return c.json({ error: 'Forbidden' }, 403)

  const userResult = (await pool.query(
    `SELECT id FROM users WHERE email = $1`,
    [email.toLowerCase()],
  )) as unknown as { rows: Array<{ id: string }> }
  const target = userResult.rows[0]
  if (!target) return c.json({ error: 'User not found' }, 404)

  try {
    await pool.query(
      `INSERT INTO memberships (user_id, workspace_id, role) VALUES ($1, $2, $3)`,
      [target.id, mem.workspace_id, role],
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/duplicate key|unique constraint|primary key/i.test(msg)) {
      return c.json({ error: 'Already a member' }, 409)
    }
    return c.json({ error: 'Failed to add member' }, 500)
  }

  return c.json({ ok: true }, 201)
})

// GET /api/workspaces/:id/api-key
workspaces.get('/:id/api-key', async c => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')

  const memResult = (await pool.query(
    `SELECT m.role, w.id AS workspace_id
     FROM memberships m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.user_id = $1 AND (w.id = $2 OR w.handle = $2) LIMIT 1`,
    [user.id, id],
  )) as unknown as { rows: Array<{ role: Role; workspace_id: string }> }

  const mem = memResult.rows[0]
  if (!mem) return c.json({ error: 'Workspace not found' }, 404)
  if (!canManage(mem.role)) return c.json({ error: 'Forbidden' }, 403)

  const result = (await pool.query(
    `SELECT key_prefix AS prefix, created_at
     FROM api_keys WHERE workspace_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [mem.workspace_id],
  )) as unknown as { rows: Array<{ prefix: string; created_at: string }> }

  return c.json({ api_key: result.rows[0] ?? null })
})

// POST /api/workspaces/:id/api-key — create or replace; the only time the raw key is returned
workspaces.post('/:id/api-key', async c => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')

  const memResult = (await pool.query(
    `SELECT m.role, w.id AS workspace_id
     FROM memberships m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.user_id = $1 AND (w.id = $2 OR w.handle = $2) LIMIT 1`,
    [user.id, id],
  )) as unknown as { rows: Array<{ role: Role; workspace_id: string }> }

  const mem = memResult.rows[0]
  if (!mem) return c.json({ error: 'Workspace not found' }, 404)
  if (!canManage(mem.role)) return c.json({ error: 'Forbidden' }, 403)

  const { raw, hash, prefix } = generateApiKey()
  // One statement, so the old key stops working at the same moment the new one starts.
  const result = (await pool.query(
    `WITH removed AS (DELETE FROM api_keys WHERE workspace_id = $1)
     INSERT INTO api_keys (workspace_id, key_hash, key_prefix, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING created_at`,
    [mem.workspace_id, hash, prefix, user.id],
  )) as unknown as { rows: Array<{ created_at: string }> }

  return c.json({ key: raw, prefix, created_at: result.rows[0]?.created_at ?? null }, 201)
})

// DELETE /api/workspaces/:id/members/:user_id
workspaces.delete('/:id/members/:user_id', async c => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')
  const targetUserId = c.req.param('user_id')

  const memResult = (await pool.query(
    `SELECT m.role, w.id AS workspace_id
     FROM memberships m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.user_id = $1 AND (w.id = $2 OR w.handle = $2) LIMIT 1`,
    [user.id, id],
  )) as unknown as { rows: Array<{ role: Role; workspace_id: string }> }

  const mem = memResult.rows[0]
  if (!mem) return c.json({ error: 'Workspace not found' }, 404)
  if (!canManage(mem.role)) return c.json({ error: 'Forbidden' }, 403)

  const targetMem = (await pool.query(
    `SELECT role FROM memberships WHERE workspace_id = $1 AND user_id = $2`,
    [mem.workspace_id, targetUserId],
  )) as unknown as { rows: Array<{ role: Role }> }

  if (targetMem.rows[0]?.role === 'owner') {
    const owners = (await pool.query(
      `SELECT COUNT(*)::int AS n FROM memberships WHERE workspace_id = $1 AND role = 'owner'`,
      [mem.workspace_id],
    )) as unknown as { rows: Array<{ n: number }> }
    if ((owners.rows[0]?.n ?? 0) <= 1) {
      return c.json({ error: 'Cannot remove the last owner' }, 400)
    }
  }

  await pool.query(
    `DELETE FROM memberships WHERE workspace_id = $1 AND user_id = $2`,
    [mem.workspace_id, targetUserId],
  )
  return c.json({ ok: true })
})

export default workspaces
