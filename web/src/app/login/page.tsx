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
            {isSignup ? 'Create your account' : 'Sign in'}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? 'One email, one password. You can change your name later.'
              : 'Use the email you signed up with.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {isSignup ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
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
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
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
                  ? 'Creating account…'
                  : 'Signing in…'
                : isSignup
                  ? 'Create account'
                  : 'Sign in'}
            </Button>
          </form>
          <div className="mt-5 flex items-center justify-between t-small text-muted">
            <span>{isSignup ? 'Already have an account?' : 'New here?'}</span>
            <button
              type="button"
              className="text-fg underline-offset-4 hover:underline"
              onClick={() => setMode(isSignup ? 'signin' : 'signup')}
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
