'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronsUpDown, LayoutDashboard, Settings, LogOut, Menu, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/use-auth'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, workspaces, activeWorkspace, switchWorkspace, logout, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="t-mono text-muted">Loading…</span>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex items-center justify-between border-b border-rule px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="t-mono">
          seriousvibes
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside
          className={cn(
            'border-r border-rule bg-bg lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col',
            mobileOpen ? 'flex flex-col' : 'hidden lg:flex',
          )}
        >
          <div className="hidden px-5 py-4 lg:block">
            <Link href="/dashboard" className="t-mono">
              seriousvibes
            </Link>
          </div>

          <div className="px-3 py-3">
            <WorkspaceSwitcher
              workspaces={workspaces}
              activeId={activeWorkspace?.id ?? null}
              onSwitch={(id) => {
                switchWorkspace(id)
                setMobileOpen(false)
              }}
            />
          </div>

          <nav className="flex-1 px-3 py-2">
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname?.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2 rounded-2 px-2 py-1.5 text-sm transition-colors duration-fast',
                        active ? 'bg-fg/5 text-fg' : 'text-muted hover:bg-fg/5 hover:text-fg',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="border-t border-rule p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex w-full items-center gap-3 rounded-2 px-2 py-2 text-left transition-colors duration-fast hover:bg-fg/5"
                  aria-label="Account menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-pill bg-accent text-accent-fg t-mono">
                    {user.name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{user.name || user.email}</div>
                    <div className="truncate t-small text-muted">{user.email}</div>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-muted" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56">
                <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
                <DropdownMenuItem disabled className="opacity-100">
                  <span className="truncate text-fg">{user.email}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void logout()}>
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        <main className="min-h-dvh">{children}</main>
      </div>
    </div>
  )
}

interface WorkspaceSwitcherProps {
  workspaces: { id: string; name: string; handle: string }[]
  activeId: string | null
  onSwitch: (id: string) => void
}

function WorkspaceSwitcher({ workspaces, activeId, onSwitch }: WorkspaceSwitcherProps) {
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full items-center justify-between gap-2 rounded-2 border border-rule bg-card px-3 py-2 text-left transition-colors duration-fast hover:border-fg/60"
          aria-label="Switch workspace"
        >
          <div className="min-w-0">
            <div className="t-mono text-muted">Workspace</div>
            <div className="truncate text-sm font-medium">
              {active?.name ?? 'No workspace'}
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.length === 0 ? (
          <DropdownMenuItem disabled>No workspaces yet</DropdownMenuItem>
        ) : (
          workspaces.map((ws) => (
            <DropdownMenuItem key={ws.id} onSelect={() => onSwitch(ws.id)}>
              <Check
                className={cn(
                  'h-4 w-4',
                  ws.id === active?.id ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span className="truncate">{ws.name}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings#workspace">
            <Plus className="h-4 w-4" /> Create workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
