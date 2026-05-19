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
import * as dbModule from '../db/client.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockQuery = (dbModule.pool.query as any) as ReturnType<typeof vi.fn>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientQuery = (dbModule as any).__clientQuery as ReturnType<typeof vi.fn>

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
      .mockResolvedValueOnce({}) // api key
      .mockResolvedValueOnce({}) // COMMIT

    const res = await authedRequest('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ handle: 'team-alpha', name: 'Team Alpha' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.workspace.id).toBe('w_2')
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

  it('rejects unknown api key (401)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await app.request('/api/workspaces', {
      headers: { Authorization: 'Bearer pk_unknown' },
    })
    expect(res.status).toBe(401)
  })
})
