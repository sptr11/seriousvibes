import { SignJWT, jwtVerify } from 'jose'

const DEFAULT_SECRET = 'change-me-to-a-32-byte-random-string'

function getKey(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? DEFAULT_SECRET
  return new TextEncoder().encode(secret)
}

export async function signAccessToken(userId: string): Promise<string> {
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getKey())
}

export async function verifyAccessToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getKey())
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null
    return { sub: payload.sub }
  } catch {
    return null
  }
}
