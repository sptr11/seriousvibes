import { randomBytes, createHash } from 'node:crypto'

// Only the hash is stored. The raw key is shown once, when it's created.
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `pk_${randomBytes(32).toString('hex')}`
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, 11) }
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}
