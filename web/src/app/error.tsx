'use client'

import { Button } from '@/components/ui/button'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="mx-auto max-w-md px-6 text-center">
        <h1 className="mb-2 text-lg font-semibold">This page failed to load</h1>
        <p className="mb-6 t-small text-muted">
          The page hit an error while rendering. Try again or reload the page.
        </p>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  )
}
