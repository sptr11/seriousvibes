'use client'

import * as React from 'react'
import Link from 'next/link'
import { Copy, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/use-auth'

interface Member {
  id: string
  email: string
  name: string
  role: string
}

const sections = [
  { id: 'profile', label: 'profile' },
  { id: 'workspace', label: 'workspace' },
  { id: 'team', label: 'team' },
  { id: 'api-key', label: 'api key' },
]

export default function SettingsPage() {
  const { user, activeWorkspace, authedFetch, loadUser } = useAuth()
  const [profileName, setProfileName] = React.useState(user?.name ?? '')
  const [profileEmail, setProfileEmail] = React.useState(user?.email ?? '')
  const [workspaceName, setWorkspaceName] = React.useState(activeWorkspace?.name ?? '')
  const [workspaceHandle, setWorkspaceHandle] = React.useState(activeWorkspace?.handle ?? '')
  const [members, setMembers] = React.useState<Member[]>([])
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [apiKey, setApiKey] = React.useState<string | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newWsName, setNewWsName] = React.useState('')
  const [newWsHandle, setNewWsHandle] = React.useState('')

  React.useEffect(() => {
    setProfileName(user?.name ?? '')
    setProfileEmail(user?.email ?? '')
  }, [user])

  React.useEffect(() => {
    setWorkspaceName(activeWorkspace?.name ?? '')
    setWorkspaceHandle(activeWorkspace?.handle ?? '')
  }, [activeWorkspace])

  React.useEffect(() => {
    if (!activeWorkspace) return
    void (async () => {
      const res = await authedFetch(`/api/workspaces/${activeWorkspace.id}/members`)
      if (res && res.ok) {
        const data = (await res.json()) as { members: Member[] }
        setMembers(data.members ?? [])
      }
      const keyRes = await authedFetch(`/api/workspaces/${activeWorkspace.id}/api-key`)
      if (keyRes && keyRes.ok) {
        const data = (await keyRes.json()) as { key: string }
        setApiKey(data.key)
      }
    })()
  }, [activeWorkspace, authedFetch])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await authedFetch('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ name: profileName, email: profileEmail }),
    })
    if (res && res.ok) {
      toast.success('profile saved')
      await loadUser()
    } else {
      toast.error("Couldn't save your profile. Try again.")
    }
  }

  const saveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspace) return
    const res = await authedFetch(`/api/workspaces/${activeWorkspace.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: workspaceName, handle: workspaceHandle }),
    })
    if (res && res.ok) {
      toast.success('workspace saved')
      await loadUser()
    } else {
      toast.error("Couldn't save the workspace. Try again.")
    }
  }

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspace) return
    const res = await authedFetch(`/api/workspaces/${activeWorkspace.id}/members`, {
      method: 'POST',
      body: JSON.stringify({ email: inviteEmail, role: 'member' }),
    })
    if (res && res.ok) {
      toast.success(`invited ${inviteEmail}`)
      setInviteEmail('')
    } else {
      toast.error("Couldn't send the invite. Check the email and try again.")
    }
  }

  const copyKey = async () => {
    if (!apiKey) return
    try {
      await navigator.clipboard.writeText(apiKey)
      toast.success('api key copied')
    } catch {
      toast.error("Couldn't copy — copy it manually.")
    }
  }

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await authedFetch('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name: newWsName, handle: newWsHandle }),
    })
    if (res && res.ok) {
      toast.success(`workspace "${newWsName}" created`)
      setCreateOpen(false)
      setNewWsName('')
      setNewWsHandle('')
      await loadUser()
    } else {
      toast.error("Couldn't create the workspace. Try a different handle.")
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-6 py-10 lg:grid-cols-[200px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-10 flex flex-col gap-1 t-small">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-1 px-2 py-1 text-muted hover:bg-fg/5 hover:text-fg"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="flex flex-col gap-10">
        <header>
          <h1 className="t-h1">settings</h1>
          <p className="t-body mt-1 text-muted">
            account and workspace controls. changes save when you submit.
          </p>
        </header>

        <section id="profile">
          <Card variant="flat">
            <CardHeader>
              <CardTitle className="t-h3">profile</CardTitle>
              <CardDescription>your name and login email.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profile-name">name</Label>
                  <Input
                    id="profile-name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profile-email">email</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Button type="submit" variant="primary">
                    save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section id="workspace">
          <Card variant="flat">
            <CardHeader>
              <CardTitle className="t-h3">workspace</CardTitle>
              <CardDescription>
                the handle appears in urls. names show up in the sidebar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveWorkspace} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ws-name">name</Label>
                  <Input
                    id="ws-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ws-handle">handle</Label>
                  <Input
                    id="ws-handle"
                    value={workspaceHandle}
                    onChange={(e) => setWorkspaceHandle(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" variant="primary">
                    save changes
                  </Button>
                  <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline">
                        <Plus className="h-4 w-4" /> create new workspace
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>create a new workspace</DialogTitle>
                        <DialogDescription>
                          you stay signed in. switch between them from the sidebar.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={createWorkspace} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="new-ws-name">name</Label>
                          <Input
                            id="new-ws-name"
                            value={newWsName}
                            onChange={(e) => setNewWsName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="new-ws-handle">handle</Label>
                          <Input
                            id="new-ws-handle"
                            value={newWsHandle}
                            onChange={(e) => setNewWsHandle(e.target.value)}
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setCreateOpen(false)}
                          >
                            cancel
                          </Button>
                          <Button type="submit" variant="primary">
                            create workspace
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section id="team">
          <Card variant="flat">
            <CardHeader>
              <CardTitle className="t-h3">team</CardTitle>
              <CardDescription>
                people in {activeWorkspace?.name ?? 'this workspace'}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {members.length === 0 ? (
                  <li className="t-small text-muted">no other members yet.</li>
                ) : (
                  members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm">{m.name || m.email}</div>
                        <div className="truncate t-small text-muted">{m.email}</div>
                      </div>
                      <Badge variant="quiet">{m.role}</Badge>
                    </li>
                  ))
                )}
              </ul>
              <form onSubmit={invite} className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  placeholder="teammate@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  aria-label="Invite email"
                />
                <Button type="submit" variant="primary">
                  send invite
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section id="api-key">
          <Card variant="flat">
            <CardHeader>
              <CardTitle className="t-h3">api key</CardTitle>
              <CardDescription>
                use this for server-to-server requests. treat it like a password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <code className="t-mono flex-1 rounded-2 border border-rule bg-card px-3 py-2 text-fg">
                  {apiKey ?? 'no key yet'}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyKey}
                  disabled={!apiKey}
                >
                  <Copy className="h-4 w-4" /> copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="t-small text-muted">
          <Link href="/dashboard" className="hover:text-fg">
            ← back to dashboard
          </Link>
        </footer>
      </div>
    </div>
  )
}
