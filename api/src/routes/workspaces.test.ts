import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db/client.js', () => {
  const query = vi.fn()
  const clientQuery = vi.fn()
  const connect = vi.fn(async () => ({
    query: clientQuery,
    release: vi.fn(),
  }))
  return {
    pool: { query, connect },
    __clientQuery: clientQuery,
  }
})

import { app } from '../index.js'
import { signAccessToken } from '../auth/jwt.js'
import { hashApiKey } from '../auth/api-keys.js'
import * as dbModule from '../db/client.js'

const mockQuery = (dbModule.pool.query as unknown) as ReturnType<typeof vi.fn>
const clientQuery = (dbModule as unknown as { __clientQuery: ReturnType<typeof vi.fn> }).__clientQuery

beforeEach(() => {
  mockQuery.mockReset()
  clientQuery.mockReset()
})

async function authedRequest(
  path: string,
  init: RequestInit & { userId?: string } = {},
) {
  const userId = init.userId ?? 'u_1'
  const token = await signAccessToken(userId)
  return app.request(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  })
}

function membershipRow(overrides: Partial<{
  user_id: string
  user_email: string
  user_name: string
  workspace_id: string
  workspace_handle: string
  workspace_name: string
  workspace_status: string
  role: string
}> = {}) {
  return {
    user_id: 'u_1',
    user_email: 'a@b.com',
    user_name: 'A',
    workspace_id: 'w_1',
    workspace_handle: 'a-workspace',
    workspace_name: "A's Workspace",
    workspace_status: 'active',
    role: 'owner',
    ...overrides,
  }
}

describe('POST /api/workspaces', () => {
  it('creates a workspace (201)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow()] }) // auth middleware
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // handle uniqueness check

    clientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 'w_2', handle: 'team-alpha', name: 'Team Alpha', status: 'active' }],
      }) // insert workspace
      .mockResolvedValueOnce({}) // membership
      .mockResolvedValueOnce({}) // COMMIT

    const res = await authedRequest('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ handle: 'team-alpha', name: 'Team Alpha' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.workspace.id).toBe('w_2')
    const sqls = clientQuery.mock.calls.map(c => String(c[0]))
    expect(sqls.some(q => /api_keys/.test(q))).toBe(false)
  })

  it('rejects duplicate handle (409)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow()] }) // auth
      .mockResolvedValueOnce({ rows: [{ id: 'w_x' }], rowCount: 1 }) // handle taken
    const res = await authedRequest('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ handle: 'taken', name: 'X' }),
    })
    expect(res.status).toBe(409)
  })

  it('rejects invalid handle (400)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [membershipRow()] }) // auth
    const res = await authedRequest('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ handle: 'BAD HANDLE!', name: 'X' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects unauthenticated (401)', async () => {
    const res = await app.request('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'team-alpha', name: 'Team Alpha' }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects reserved handle (400)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [membershipRow()] })
    const res = await authedRequest('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ handle: 'admin', name: 'X' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/workspaces/:id', () => {
  it('returns workspace for member (200)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow()] }) // auth
      .mockResolvedValueOnce({
        rows: [
          { id: 'w_1', handle: 'a-workspace', name: "A's Workspace", status: 'active', role: 'owner' },
        ],
      })
    const res = await authedRequest('/api/workspaces/w_1')
    expect(res.status).toBe(200)
  })

  it('returns 404 for non-member', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow()] }) // auth
      .mockResolvedValueOnce({ rows: [] }) // not a member
    const res = await authedRequest('/api/workspaces/w_other')
    expect(res.status).toBe(404)
  })

  it('rejects suspended workspace in middleware (403)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [membershipRow({ workspace_status: 'suspended' })],
    })
    const res = await authedRequest('/api/workspaces/w_1')
    expect(res.status).toBe(403)
  })
})

describe('PATCH /api/workspaces/:id', () => {
  it('updates as owner (200)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow()] }) // auth
      .mockResolvedValueOnce({ rows: [{ role: 'owner', id: 'w_1' }] }) // membership check
      .mockResolvedValueOnce({
        rows: [{ id: 'w_1', handle: 'a-workspace', name: 'New Name', status: 'active' }],
      }) // update

    const res = await authedRequest('/api/workspaces/w_1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.workspace.name).toBe('New Name')
  })

  it('rejects member without permission (403)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow({ role: 'member' })] }) // auth
      .mockResolvedValueOnce({ rows: [{ role: 'member', id: 'w_1' }] }) // membership check
    const res = await authedRequest('/api/workspaces/w_1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'X' }),
    })
    expect(res.status).toBe(403)
  })
})

describe('GET /api/workspaces', () => {
  it('lists user workspaces', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow()] }) // auth
      .mockResolvedValueOnce({
        rows: [{ id: 'w_1', handle: 'a-workspace', name: "A's", status: 'active', role: 'owner' }],
      })
    const res = await authedRequest('/api/workspaces')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.workspaces.length).toBe(1)
  })
})

describe('API key auth path', () => {
  it('accepts pk_ token and sets workspace', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          user_id: 'u_1',
          user_email: 'a@b.com',
          user_name: 'A',
          workspace_id: 'w_1',
          workspace_handle: 'a-workspace',
          workspace_name: "A's Workspace",
          workspace_status: 'active',
          role: 'owner',
        },
      ],
    }).mockResolvedValueOnce({
      rows: [{ id: 'w_1', handle: 'a-workspace', name: "A's", status: 'active', role: 'owner' }],
    })

    const res = await app.request('/api/workspaces', {
      headers: { Authorization: 'Bearer pk_testkey' },
    })
    expect(res.status).toBe(200)
  })

  it('looks the key up by its hash, never the raw value', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await app.request('/api/workspaces', {
      headers: { Authorization: 'Bearer pk_testkey' },
    })
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]]
    expect(sql).toMatch(/k\.key_hash = \$1/)
    expect(params).toEqual([hashApiKey('pk_testkey')])
  })

  it('rejects unknown api key (401)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await app.request('/api/workspaces', {
      headers: { Authorization: 'Bearer pk_unknown' },
    })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/workspaces/:id/api-key', () => {
  it('returns the prefix and creation time, never the key (200)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow()] }) // auth
      .mockResolvedValueOnce({ rows: [{ role: 'owner', workspace_id: 'w_1' }] }) // membership
      .mockResolvedValueOnce({ rows: [{ prefix: 'pk_1a2b3c4d', created_at: '2026-10-17T00:00:00Z' }] })

    const res = await authedRequest('/api/workspaces/w_1/api-key')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ api_key: { prefix: 'pk_1a2b3c4d', created_at: '2026-10-17T00:00:00Z' } })

    const [sql, params] = mockQuery.mock.calls[2] as [string, unknown[]]
    expect(sql).toMatch(/key_prefix AS prefix/)
    expect(sql).toMatch(/workspace_id = \$1/)
    expect(params).toEqual(['w_1'])
  })

  it('returns null when the workspace has no key', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow()] })
      .mockResolvedValueOnce({ rows: [{ role: 'owner', workspace_id: 'w_1' }] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await authedRequest('/api/workspaces/w_1/api-key')
    expect(await res.json()).toEqual({ api_key: null })
  })

  it('rejects a member without manage rights (403)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow({ role: 'member' })] })
      .mockResolvedValueOnce({ rows: [{ role: 'member', workspace_id: 'w_1' }] })

    const res = await authedRequest('/api/workspaces/w_1/api-key')
    expect(res.status).toBe(403)
  })

  it('returns 404 for a workspace the user is not in', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow()] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await authedRequest('/api/workspaces/w_other/api-key')
    expect(res.status).toBe(404)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })
})

describe('POST /api/workspaces/:id/api-key', () => {
  it('replaces the key and returns the raw value once (201)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow()] }) // auth
      .mockResolvedValueOnce({ rows: [{ role: 'owner', workspace_id: 'w_1' }] }) // membership
      .mockResolvedValueOnce({ rows: [{ created_at: '2026-10-17T00:00:00Z' }] }) // replace

    const res = await authedRequest('/api/workspaces/w_1/api-key', { method: 'POST' })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.key).toMatch(/^pk_[0-9a-f]{64}$/)
    expect(body.prefix).toBe(body.key.slice(0, 11))

    const [sql, params] = mockQuery.mock.calls[2] as [string, unknown[]]
    expect(sql).toMatch(/DELETE FROM api_keys WHERE workspace_id = \$1/)
    expect(params).toContain('w_1')
    expect(params).toContain(hashApiKey(body.key))
    expect(params).not.toContain(body.key)
  })

  it('rejects a member without manage rights (403)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow({ role: 'member' })] })
      .mockResolvedValueOnce({ rows: [{ role: 'member', workspace_id: 'w_1' }] })

    const res = await authedRequest('/api/workspaces/w_1/api-key', { method: 'POST' })
    expect(res.status).toBe(403)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('returns 404 for a workspace the user is not in', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [membershipRow()] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await authedRequest('/api/workspaces/w_other/api-key', { method: 'POST' })
    expect(res.status).toBe(404)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('rejects unauthenticated requests (401)', async () => {
    const res = await app.request('/api/workspaces/w_1/api-key', { method: 'POST' })
    expect(res.status).toBe(401)
  })
})
