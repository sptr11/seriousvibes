# CLAUDE.md — seriousvibes (root)

You are working in a project bootstrapped from **seriousvibes**, a starter that bakes in security, testing, design tokens, and copy conventions so vibe-coded products don't accumulate churn.

## Read these before writing code

- **[`BLUEPRINT.md`](./BLUEPRINT.md)** — the build sequence. Know which phase you're in. Don't skip ahead.
- **[`docs/SECURITY.md`](./docs/SECURITY.md)** — auth, scoping, input validation, secrets.
- **[`docs/TESTING.md`](./docs/TESTING.md)** — TDD pattern, vitest setup, e2e flow.
- **[`docs/COPY_GUIDE.md`](./docs/COPY_GUIDE.md)** — voice, banned words, error message patterns.
- **[`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md)** — tokens, components, when to add variants.

Per-package conventions live in `api/CLAUDE.md` and `web/CLAUDE.md`.

## Stack

- **API:** Hono + Postgres (`pg`) + TypeScript. No ORM.
- **Web:** Next.js 15 (App Router) + Tailwind + shadcn/ui.
- **Auth:** `bcryptjs` for passwords, `jose` for JWT, refresh cookies (httpOnly).
- **Tests:** Vitest (unit, in-process via `app.request()`), Playwright (e2e).
- **Monorepo:** npm workspaces.

## Workflow for non-trivial changes

Before implementing anything beyond a typo fix:

1. **Plan.** What does it do? UI/UX, API calls, edge cases, file list, sequence.
2. **Issue.** Put the plan in a GitHub issue.
3. **TDD.** Write failing tests first. Then make them pass.

"Non-trivial" = new endpoint, new page, schema change, multi-file refactor.

## Hard rules

- **Multi-tenancy is non-negotiable.** Every authenticated DB query must include `workspace_id = $n`. The auth middleware sets `c.get('workspace')` — use it.
- **Never log secrets.** JWTs, API keys, password hashes never appear in logs or error messages.
- **Parameterized queries only.** No string concatenation in SQL, ever.
- **Validate at boundaries.** Zod schemas for every request body. Trust internal code.
- **Tests run in CI.** No commits to main if `npm test` fails.

## Dev

```bash
npm install
cp .env.example .env  # set DATABASE_URL, JWT_SECRET
npm run migrate -w api
npm run dev           # api: 3001, web: 3000
```

## When in doubt

- Read `BLUEPRINT.md` and figure out the phase.
- Read the per-package `CLAUDE.md`.
- Don't add features the user didn't ask for.
- Don't write comments that explain *what* the code does. Code does that. Comments are for *why* — non-obvious constraints, workarounds, surprising behavior.
