import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const tiles = [
  {
    title: 'Design tokens, not hex codes',
    body: 'One CSS file controls every color, radius, and shadow. Change a token and the whole app follows.',
  },
  {
    title: 'Auth that works on day one',
    body: 'Signup, login, refresh cookies and workspace scoping, wired up before you write your first endpoint.',
  },
  {
    title: 'Tests that run in under a second',
    body: 'Vitest with a mocked pool, Playwright for the flows you care about. TDD is the default.',
  },
]

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-16 sm:py-24">
      <header className="flex items-center justify-between">
        <Link href="/" className="t-mono">
          seriousvibes
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="t-small text-muted hover:text-fg">
            Sign in
          </Link>
        </nav>
      </header>

      <section className="mt-20 flex flex-col gap-6 sm:mt-28">
        <div>
          <Badge variant="accent" className="mb-5">
            A starter for vibe coders
          </Badge>
          <h1 className="t-display max-w-3xl font-medium">
            Ship the thing.{' '}
            <span className="t-emphasis">Skip the rework.</span>
          </h1>
        </div>
        <p className="t-body max-w-2xl text-muted">
          A Next.js and Hono starter with the boring decisions made: design tokens before
          components, copy rules before pages, tests before features.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/login">
              Start building
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-24 grid gap-5 sm:mt-32 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.title} variant="stamp">
            <CardHeader>
              <CardTitle>{tile.title}</CardTitle>
              <CardDescription>{tile.body}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="t-mono text-muted">{tile.title.split(',')[0]}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      <footer className="mt-auto pt-24 t-small text-muted">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-6">
          <span>Built with seriousvibes.</span>
          <Link href="/login" className="hover:text-fg">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  )
}
