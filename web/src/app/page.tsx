import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const tiles = [
  {
    title: 'design tokens, not hex codes',
    body: 'one css file controls every color, radius, and shadow. change a token, the whole app moves with it.',
  },
  {
    title: 'auth that works on day one',
    body: 'signup, login, refresh cookies, workspace scoping. wired up before you write your first endpoint.',
  },
  {
    title: 'tests that run in under a second',
    body: 'vitest with mocked pools, playwright for the one flow you actually care about. tdd is the default.',
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
            sign in
          </Link>
        </nav>
      </header>

      <section className="mt-20 flex flex-col gap-6 sm:mt-28">
        <div>
          <Badge variant="accent" className="mb-5">
            a starter for vibe coders
          </Badge>
          <h1 className="t-display max-w-3xl font-medium">
            ship the thing.{' '}
            <span className="font-serif italic">skip the rework.</span>
          </h1>
        </div>
        <p className="t-body max-w-2xl text-muted">
          a next.js and hono starter with the boring decisions made: design tokens before
          components, copy rules before pages, tests before features. no retrofits.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/login">
              start building
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <a href="https://github.com/sptr11/seriousvibes/blob/main/BLUEPRINT.md">
              read the blueprint
            </a>
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
          <span>built with the seriousvibes blueprint.</span>
          <Link href="/login" className="hover:text-fg">
            sign in
          </Link>
        </div>
      </footer>
    </main>
  )
}
