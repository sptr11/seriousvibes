import type { Context, MiddlewareHandler } from 'hono'
import { pool } from '../db/client.js'
import { verifyAccessToken } from '../auth/jwt.js'
import { hashApiKey } from '../auth/api-keys.js'
import type { AppVariables, Membership, User, Workspace, Role } from '../types.js'

type Env = { Variables: AppVariables }

function unauthorized(c: Context) {
  return c.json({ error: 'Unauthorized' }, 401)
}

function forbidden(c: Context, msg = 'Forbidden') {
  return c.json({ error: msg }, 403)
}

type ApiKeyRow = {
  user_id: string | null
  user_email: string | null
  user_name: string | null
  workspace_id: string
  workspace_handle: string
  workspace_name: string
  workspace_status: 'active' | 'suspended'
  role: Role | null
}

type MembershipRow = {
  user_id: string
  user_email: string
  user_name: string
  workspace_id: string
  workspace_handle: string
  workspace_name: string
  workspace_status: 'active' | 'suspended'
  role: Role
}

export const requireAuth: MiddlewareHandler<Env> = async (c, next) => {
  const header = c.req.header('Authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match || !match[1]) return unauthorized(c)
  const token = match[1].trim()

  if (token.startsWith('pk_')) {
    const result = (await pool.query(
      `SELECT
         u.id AS user_id, u.email AS user_email, u.name AS user_name,
         w.id AS workspace_id, w.handle AS workspace_handle, w.name AS workspace_name, w.status AS workspace_status,
         m.role AS role
       FROM api_keys k
       JOIN workspaces w ON w.id = k.workspace_id
       LEFT JOIN users u ON u.id = k.created_by
       LEFT JOIN memberships m ON m.workspace_id = w.id AND m.user_id = u.id
       WHERE k.key_hash = $1
       LIMIT 1`,
      [hashApiKey(token)],
    )) as unknown as { rows: ApiKeyRow[] }

    const row = result.rows[0]
    if (!row) return unauthorized(c)
    if (row.workspace_status === 'suspended') return forbidden(c, 'Workspace suspended')

    const user: User | null = row.user_id
      ? { id: row.user_id, email: row.user_email ?? '', name: row.user_name ?? '' }
      : null

    const workspace: Workspace = {
      id: row.workspace_id,
      handle: row.workspace_handle,
      name: row.workspace_name,
      status: row.workspace_status,
    }

    const membership: Membership = {
      user_id: row.user_id ?? 'api_key',
      workspace_id: row.workspace_id,
      role: row.role ?? 'api_key',
    }

    c.set('user', user)
    c.set('workspace', workspace)
    c.set('membership', membership)
    c.set('authSource', 'api_key')
    await next()
    return
  }

  const payload = await verifyAccessToken(token)
  if (!payload) return unauthorized(c)
  const userId = payload.sub

  const requestedWorkspace = c.req.header('X-Workspace')

  let result: { rows: MembershipRow[] }
  if (requestedWorkspace) {
    result = (await pool.query(
      `SELECT
         u.id AS user_id, u.email AS user_email, u.name AS user_name,
         w.id AS workspace_id, w.handle AS workspace_handle, w.name AS workspace_name, w.status AS workspace_status,
         m.role AS role
       FROM memberships m
       JOIN workspaces w ON w.id = m.workspace_id
       JOIN users u ON u.id = m.user_id
       WHERE m.user_id = $1 AND (w.id = $2 OR w.handle = $2)
       ORDER BY m.created_at ASC
       LIMIT 1`,
      [userId, requestedWorkspace],
    )) as unknown as { rows: MembershipRow[] }
  } else {
    result = (await pool.query(
      `SELECT
         u.id AS user_id, u.email AS user_email, u.name AS user_name,
         w.id AS workspace_id, w.handle AS workspace_handle, w.name AS workspace_name, w.status AS workspace_status,
         m.role AS role
       FROM memberships m
       JOIN workspaces w ON w.id = m.workspace_id
       JOIN users u ON u.id = m.user_id
       WHERE m.user_id = $1
       ORDER BY m.created_at ASC
       LIMIT 1`,
      [userId],
    )) as unknown as { rows: MembershipRow[] }
  }

  const row = result.rows[0]
  if (!row) return unauthorized(c)
  if (row.workspace_status === 'suspended') return forbidden(c, 'Workspace suspended')

  c.set('user', {
    id: row.user_id,
    email: row.user_email,
    name: row.user_name,
  })
  c.set('workspace', {
    id: row.workspace_id,
    handle: row.workspace_handle,
    name: row.workspace_name,
    status: row.workspace_status,
  })
  c.set('membership', {
    user_id: row.user_id,
    workspace_id: row.workspace_id,
    role: row.role,
  })
  c.set('authSource', 'jwt')
  await next()
}
