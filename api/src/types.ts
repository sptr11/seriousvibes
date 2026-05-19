export type User = {
  id: string
  email: string
  name: string
  created_at?: string
}

export type Workspace = {
  id: string
  handle: string
  name: string
  status: 'active' | 'suspended'
  created_at?: string
}

export type Role = 'owner' | 'admin' | 'member'

export type Membership = {
  user_id: string
  workspace_id: string
  role: Role | 'api_key'
}

export type AuthSource = 'jwt' | 'api_key'

export type AppVariables = {
  user: User | null
  workspace: Workspace
  membership: Membership
  authSource: AuthSource
}
