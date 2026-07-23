'use client'

import { Button } from '@/components/ui/button'

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <div className="mx-auto max-w-md px-6 text-center">
        <h1 className="mb-2 text-lg font-semibold">This page failed to load</h1>
        <p className="mb-6 t-small text-muted">
          Something went wrong. Try again or head back to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
          <Button variant="ghost" asChild>
            <a href="/dashboard">Back to dashboard</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
