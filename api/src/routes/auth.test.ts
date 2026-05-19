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

vi.mock('../auth/passwords.js', () => ({
  hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
  verifyPassword: vi.fn(async (p: string, h: string) => h === `hashed:${p}`),
}))

import { app } from '../index.js'
import * as dbModule from '../db/client.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockQuery = (dbModule.pool.query as any) as ReturnType<typeof vi.fn>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientQuery = (dbModule as any).__clientQuery as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockQuery.mockReset()
  clientQuery.mockReset()
})

function jsonReq(path: string, method: string, body: unknown, headers: Record<string, string> = {}) {
  return app.request(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('POST /api/auth/signup', () => {
  it('creates user, workspace, membership, api key, refresh token (201)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // email check

    clientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'u_1', email: 'a@b.com', name: 'A' }] }) // insert user
      .mockResolvedValueOnce({
        rows: [{ id: 'w_1', handle: 'a-1234', name: "A's Workspace", status: 'active' }],
      }) // insert workspace
      .mockResolvedValueOnce({}) // insert membership
      .mockResolvedValueOnce({}) // insert api key
      .mockResolvedValueOnce({}) // insert refresh token
      .mockResolvedValueOnce({}) // COMMIT

    const res = await jsonReq('/api/auth/signup', 'POST', {
      email: 'a@b.com',
      password: 'password123',
      name: 'A',
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.token).toBeTruthy()
    expect(body.user.id).toBe('u_1')
    expect(body.workspace.id).toBe('w_1')
    expect(res.headers.get('Set-Cookie')).toMatch(/refresh=/)
  })

  it('rejects duplicate emails (409)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'u_existing' }], rowCount: 1 })
    const res = await jsonReq('/api/auth/signup', 'POST', {
      email: 'taken@b.com',
      password: 'password123',
      name: 'A',
    })
    expect(res.status).toBe(409)
  })

  it('rejects weak password (400)', async () => {
    const res = await jsonReq('/api/auth/signup', 'POST', {
      email: 'a@b.com',
      password: 'short',
      name: 'A',
    })
    expect(res.status).toBe(400)
  })

  it('rejects malformed email (400)', async () => {
    const res = await jsonReq('/api/auth/signup', 'POST', {
      email: 'not-an-email',
      password: 'password123',
      name: 'A',
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('returns token for valid credentials', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'u_1', email: 'a@b.com', password_hash: 'hashed:password123', name: 'A' }],
      }) // find user
      .mockResolvedValueOnce({}) // insert refresh

    const res = await jsonReq('/api/auth/login', 'POST', {
      email: 'a@b.com',
      password: 'password123',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBeTruthy()
    expect(res.headers.get('Set-Cookie')).toMatch(/refresh=/)
  })

  it('rejects wrong password (401)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'u_1', email: 'a@b.com', password_hash: 'hashed:correct', name: 'A' }],
    })
    const res = await jsonReq('/api/auth/login', 'POST', {
      email: 'a@b.com',
      password: 'wrong',
    })
    expect(res.status).toBe(401)
  })

  it('rejects nonexistent email (401)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await jsonReq('/api/auth/login', 'POST', {
      email: 'nope@b.com',
      password: 'password123',
    })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/refresh', () => {
  it('rotates refresh token and returns new access token', async () => {
    const future = new Date(Date.now() + 86400_000).toISOString()
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'rt_1', user_id: 'u_1', expires_at: future }] }) // find token
      .mockResolvedValueOnce({}) // delete old
      .mockResolvedValueOnce({}) // insert new

    const res = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: { Cookie: 'refresh=abc123' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBeTruthy()
  })

  it('rejects missing cookie (401)', async () => {
    const res = await app.request('/api/auth/refresh', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('rejects expired token (401)', async () => {
    const past = new Date(Date.now() - 86400_000).toISOString()
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'rt_1', user_id: 'u_1', expires_at: past }] })
      .mockResolvedValueOnce({}) // delete

    const res = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: { Cookie: 'refresh=abc123' },
    })
    expect(res.status).toBe(401)
  })
})
