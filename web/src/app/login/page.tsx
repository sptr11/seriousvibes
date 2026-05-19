'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/use-auth'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const { login, signup, user, loading } = useAuth()
  const [mode, setMode] = React.useState<Mode>('signin')
  const [submitting, setSubmitting] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [name, setName] = React.useState('')

  React.useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [loading, user, router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signup({ email, password, name })
      } else {
        await login({ email, password })
      }
      router.replace('/dashboard')
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : mode === 'signup'
            ? "Couldn't create your account. Check the details and try again."
            : "Couldn't sign you in — wrong email or password."
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="t-mono mb-8 self-start text-muted hover:text-fg">
        ← seriousvibes
      </Link>
      <Card variant="stamp">
        <CardHeader>
          <CardTitle className="t-h2">
            {isSignup ? 'create your account' : 'sign in'}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? 'one email, one password. you can rename later.'
              : 'use the email you signed up with.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {isSignup ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" variant="primary" size="lg" disabled={submitting}>
              {submitting
                ? isSignup
                  ? 'creating account…'
                  : 'signing in…'
                : isSignup
                  ? 'create account'
                  : 'sign in'}
            </Button>
          </form>
          <div className="mt-5 flex items-center justify-between t-small text-muted">
            <span>{isSignup ? 'already have an account?' : 'new here?'}</span>
            <button
              type="button"
              className="text-fg underline-offset-4 hover:underline"
              onClick={() => setMode(isSignup ? 'signin' : 'signup')}
            >
              {isSignup ? 'sign in' : 'create one'}
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
