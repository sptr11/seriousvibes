'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

const TOKEN_KEY = 'sv_token'
const WORKSPACE_KEY = 'sv_workspace'

export interface User {
  id: string
  email: string
  name: string
}

export interface Workspace {
  id: string
  name: string
  handle: string
  role?: string
}

interface AuthState {
  user: User | null
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  token: string | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signup: (input: { email: string; password: string; name: string }) => Promise<void>
  login: (input: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  authedFetch: (path: string, opts?: RequestInit) => Promise<Response | null>
  switchWorkspace: (id: string) => void
  loadUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // ignore quota/private-mode errors
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = React.useState<AuthState>({
    user: null,
    workspaces: [],
    activeWorkspace: null,
    token: null,
    loading: true,
  })

  const tokenRef = React.useRef<string | null>(null)
  const workspaceRef = React.useRef<string | null>(null)

  const setToken = React.useCallback((token: string | null) => {
    tokenRef.current = token
    writeStorage(TOKEN_KEY, token)
  }, [])

  const setActiveWorkspaceId = React.useCallback((id: string | null) => {
    workspaceRef.current = id
    writeStorage(WORKSPACE_KEY, id)
  }, [])

  const baseFetch = React.useCallback(
    async (path: string, opts: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(opts.headers)
      if (!headers.has('Content-Type') && opts.body) {
        headers.set('Content-Type', 'application/json')
      }
      if (tokenRef.current) headers.set('Authorization', `Bearer ${tokenRef.current}`)
      if (workspaceRef.current) headers.set('X-Workspace', workspaceRef.current)
      return fetch(path, { ...opts, headers, credentials: 'include' })
    },
    [],
  )

  const tryRefresh = React.useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return false
      const data = (await res.json()) as { token?: string }
      if (!data.token) return false
      setToken(data.token)
      setState((s) => ({ ...s, token: data.token ?? null }))
      return true
    } catch {
      return false
    }
  }, [setToken])

  const clearSession = React.useCallback(() => {
    setToken(null)
    setActiveWorkspaceId(null)
    setState({
      user: null,
      workspaces: [],
      activeWorkspace: null,
      token: null,
      loading: false,
    })
  }, [setToken, setActiveWorkspaceId])

  const authedFetch = React.useCallback<AuthContextValue['authedFetch']>(
    async (path, opts) => {
      if (!tokenRef.current) return null
      let res = await baseFetch(path, opts)
      if (res.status === 401) {
        const refreshed = await tryRefresh()
        if (!refreshed) {
          clearSession()
          router.push('/login')
          return res
        }
        res = await baseFetch(path, opts)
      }
      return res
    },
    [baseFetch, tryRefresh, clearSession, router],
  )

  const loadUser = React.useCallback(async () => {
    if (!tokenRef.current) {
      setState((s) => ({ ...s, loading: false }))
      return
    }
    const res = await authedFetch('/api/auth/me')
    if (!res || !res.ok) {
      clearSession()
      return
    }
    const data = (await res.json()) as { user: User; workspaces: Workspace[] }
    const workspaces = data.workspaces ?? []
    const storedId = workspaceRef.current
    const fallback = workspaces[0] ?? null
    const active = workspaces.find((w) => w.id === storedId) ?? fallback
    if (active) setActiveWorkspaceId(active.id)
    setState({
      user: data.user,
      workspaces,
      activeWorkspace: active,
      token: tokenRef.current,
      loading: false,
    })
  }, [authedFetch, clearSession, setActiveWorkspaceId])

  React.useEffect(() => {
    const storedToken = readStorage(TOKEN_KEY)
    const storedWorkspace = readStorage(WORKSPACE_KEY)
    tokenRef.current = storedToken
    workspaceRef.current = storedWorkspace
    setState((s) => ({ ...s, token: storedToken }))
    void loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signup = React.useCallback<AuthContextValue['signup']>(
    async (input) => {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? "Couldn't create your account.")
      }
      const data = (await res.json()) as { token: string }
      setToken(data.token)
      setState((s) => ({ ...s, token: data.token }))
      await loadUser()
    },
    [setToken, loadUser],
  )

  const login = React.useCallback<AuthContextValue['login']>(
    async (input) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        throw new Error("Couldn't sign you in — wrong email or password.")
      }
      const data = (await res.json()) as { token: string }
      setToken(data.token)
      setState((s) => ({ ...s, token: data.token }))
      await loadUser()
    },
    [setToken, loadUser],
  )

  const logout = React.useCallback<AuthContextValue['logout']>(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    clearSession()
    router.push('/login')
  }, [clearSession, router])

  const switchWorkspace = React.useCallback<AuthContextValue['switchWorkspace']>(
    (id) => {
      setActiveWorkspaceId(id)
      setState((s) => {
        const active = s.workspaces.find((w) => w.id === id) ?? s.activeWorkspace
        return { ...s, activeWorkspace: active }
      })
    },
    [setActiveWorkspaceId],
  )

  const value = React.useMemo<AuthContextValue>(
    () => ({ ...state, signup, login, logout, authedFetch, switchWorkspace, loadUser }),
    [state, signup, login, logout, authedFetch, switchWorkspace, loadUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
