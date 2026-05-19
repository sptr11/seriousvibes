import { randomBytes, createHash } from 'node:crypto'

export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7

export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex')
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function refreshCookie(raw: string): string {
  return `refresh=${raw}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=${REFRESH_TTL_SECONDS}`
}

export function clearRefreshCookie(): string {
  return 'refresh=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=0'
}

export function parseRefreshCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(/;\s*/)
  for (const p of parts) {
    const eq = p.indexOf('=')
    if (eq === -1) continue
    const name = p.slice(0, eq).trim()
    if (name === 'refresh') return p.slice(eq + 1)
  }
  return null
}
