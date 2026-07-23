'use client'

// Inline styles: when global-error fires, the root layout (and its CSS) may not have loaded.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-[#faf8f4] text-[#0a0a0a] antialiased">
        <div className="mx-auto max-w-md px-6 text-center">
          <h1 className="mb-2 text-lg font-semibold">Something broke</h1>
          <p className="mb-6 text-sm text-[#4a4560]">
            An unexpected error occurred. Try again or reload the page.
          </p>
          <button
            onClick={reset}
            className="rounded-lg border border-[#c5c0b5] bg-white px-4 py-2 text-sm font-medium transition-colors hover:border-[#0a0a0a]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
