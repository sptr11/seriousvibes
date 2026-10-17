import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { generateApiKey, hashApiKey } from './api-keys.js'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

describe('generateApiKey', () => {
  it('returns a pk_ key, its sha-256 hash, and a display prefix', () => {
    const { raw, hash, prefix } = generateApiKey()
    expect(raw).toMatch(/^pk_[0-9a-f]{64}$/)
    expect(hash).toBe(sha256(raw))
    expect(prefix).toBe(raw.slice(0, 11))
  })

  it('returns a different key every call', () => {
    expect(generateApiKey().raw).not.toBe(generateApiKey().raw)
  })
})

describe('hashApiKey', () => {
  it('matches the hash generateApiKey stores', () => {
    const { raw, hash } = generateApiKey()
    expect(hashApiKey(raw)).toBe(hash)
  })
})
