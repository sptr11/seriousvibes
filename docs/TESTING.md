# TESTING.md

TDD by default. The whole suite runs in under a second.

## The TDD loop

For every non-trivial change:

1. **Write a failing test** that defines the expected behavior.
2. **Implement** the minimum code to make it pass.
3. **Refactor** if the result is ugly. Tests still pass.

If you can't write the test, you don't understand the behavior yet.

## Vitest setup (API)

Tests live next to source (`auth.test.ts` next to `auth.ts`).

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { app } from '../index.js'

vi.mock('../db/client.js', () => ({
  pool: { query: vi.fn() },
}))

import { pool } from '../db/client.js'
const mockQuery = pool.query as ReturnType<typeof vi.fn>

beforeEach(() => mockQuery.mockReset())

describe('POST /api/auth/signup', () => {
  it('creates a user and returns a token', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // email check
      .mockResolvedValueOnce({ rows: [{ id: 'u_1' }] })  // insert user
      // ... etc

    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'password123', name: 'Test' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.token).toBeTruthy()
  })

  it('rejects duplicate emails', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'u_existing' }], rowCount: 1 })
    const res = await app.request('/api/auth/signup', { /* ... */ })
    expect(res.status).toBe(409)
  })
})
```

**Why this pattern works:**

- No test server, no ports, no cleanup.
- `app.request()` is Hono's in-process request handler. It runs your real middleware chain.
- Mocking `pool.query` is fast and explicit — you control what the DB returns for each call.
- Tests run in <1s. You'll actually run them.

## Failure cases matter more than happy paths

For every test of "it works," write one of "it correctly refuses":

- Wrong workspace? `403`.
- Expired token? `401`.
- Malformed input? `400`.
- Missing required field? `400` with field name.
- Suspended workspace? `403`.

We've shipped bugs where the happy path was tested and the failure path wasn't. The most expensive was a slug lookup that didn't include `workspace_id` — happy path passed because there was only one workspace.

## Playwright (E2E)

For UI-critical flows: landing → signup → dashboard.

```ts
import { test, expect } from '@playwright/test'

test('signup flow lands user on dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(`test+${Date.now()}@example.com`)
  await page.getByLabel('Password').fill('password123')
  await page.getByLabel('Name').fill('E2E Test')
  await page.getByRole('button', { name: /create account/i }).click()
  await expect(page).toHaveURL(/\/dashboard/)
})
```

Run against the dev server (`reuseExistingServer: !process.env.CI`). E2E is for catching regressions in critical flows, not for everything.

## What to test

| What | Where | How |
|---|---|---|
| Auth (signup, login, refresh, logout) | API unit | mocked pool + `app.request()` |
| Workspace scoping (every route) | API unit | Test that wrong workspace returns 404/403 |
| Input validation | API unit | Send bad input, expect 400 with field info |
| Business logic (limits, transitions) | API unit | mocked pool |
| Critical user flows | E2E | Playwright |
| Component rendering | Skip | Type-checking + visual review catches enough |
| Design tokens | Skip | Visual review |

## What NOT to test

- The framework. Don't test that Next.js renders pages.
- Internal helpers used by one caller. Inline tests for them through the caller.
- Pure UI components. Test the behavior they enable, in E2E.

## Running tests

```bash
npm test                # all unit tests
npm test -w api         # API only
npm run test:watch -w api  # watch mode while developing
npm run test:e2e -w web    # Playwright
npm run typecheck       # tsc --noEmit, also catches stuff tests miss
```

## CI

The `.github/workflows/ci.yml` runs:

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run lint`

E2E is not included in the default workflow — add a separate job with a database service container when you need it.

## Pre-commit (optional)

Add `husky` + `lint-staged` when you want pre-commit enforcement:

```bash
npm install -D husky lint-staged
npx husky init
```

Suggested lint-staged config in `package.json`:

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "tsc-files --noEmit"]
}
```

If pre-commit fails, fix it. Don't `--no-verify`.

## When you skip TDD

If you genuinely cannot test something (e.g., a CSS tweak, a copy fix), say so in the commit message. Don't pretend. The honesty preserves the rule.
