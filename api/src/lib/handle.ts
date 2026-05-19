export const RESERVED_HANDLES = new Set([
  'admin',
  'api',
  'www',
  'root',
  'settings',
])

const HANDLE_RE = /^[a-z0-9][a-z0-9_-]{2,29}$/

export function isValidHandle(handle: string): boolean {
  if (!HANDLE_RE.test(handle)) return false
  if (RESERVED_HANDLES.has(handle)) return false
  return true
}
