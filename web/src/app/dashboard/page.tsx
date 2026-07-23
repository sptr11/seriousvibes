'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/lib/use-auth'

export default function DashboardHome() {
  const { activeWorkspace } = useAuth()
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="t-mono text-muted">workspace</div>
          <h1 className="t-h1">{activeWorkspace?.name ?? 'no workspace yet'}</h1>
        </div>
      </header>

      <Card variant="stamp">
        <CardContent className="flex flex-col items-start gap-4 p-8">
          <div>
            <h2 className="t-h3">this is a starter, not a product yet</h2>
            <p className="t-body mt-1 text-muted">
              auth and workspaces are wired up. grab your api key, invite your team, or start
              building the thing this workspace is actually for.
            </p>
          </div>
          <Button asChild variant="primary">
            <Link href="/dashboard/settings">
              go to settings <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
