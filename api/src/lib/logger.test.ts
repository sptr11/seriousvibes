import { describe, it, expect, vi, afterEach } from 'vitest'

describe('log (dev mode)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('includes extra data fields in the console line, not just the message', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { log } = await import('./logger.js')

    log.error('migration failed', { message: 'role postgres does not exist' })

    const line = spy.mock.calls[0][0] as string
    expect(line).toContain('migration failed')
    expect(line).toContain('role postgres does not exist')
  })
})
