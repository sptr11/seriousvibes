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
          <div className="t-mono text-muted">Workspace</div>
          <h1 className="t-h1">{activeWorkspace?.name ?? 'No workspace yet'}</h1>
        </div>
      </header>

      <Card variant="stamp">
        <CardContent className="flex flex-col items-start gap-4 p-8">
          <div>
            <h2 className="t-h3">Auth and workspaces are ready</h2>
            <p className="t-body mt-1 text-muted">
              Add your team, create an API key, then build the thing this workspace is for.
            </p>
          </div>
          <Button asChild variant="primary">
            <Link href="/dashboard/settings">
              Go to settings <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
