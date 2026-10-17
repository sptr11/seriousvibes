# AGENTS.md — seriousvibes (root)

You are working in a project bootstrapped from **seriousvibes**, a starter that bakes in security, testing, design tokens, and copy conventions so vibe-coded products don't accumulate churn.

## First run (delete this section when done)

If `package.json` still says `"name": "seriousvibes"`, this is the unmodified starter. Before writing product code, offer to run setup. Ask the user for:

- the product name
- one sentence on what it does and who it's for
- three adjectives for the voice
- brand colors (optional)

Then follow "Make it yours" in `README.md`, steps 1–4. Show the user the diff, and delete this section once they approve it.

## Read these before writing code

- **[`docs/SECURITY.md`](./docs/SECURITY.md)** — auth, scoping, input validation, role-gated UI, frontend resilience.
- **[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)** — single-service pattern, migration resilience, health endpoint, monitoring, env vars.
- **[`docs/TESTING.md`](./docs/TESTING.md)** — TDD pattern, vitest setup, e2e flow.
- **[`docs/COPY_GUIDE.md`](./docs/COPY_GUIDE.md)** — voice, banned words, error message patterns.
- **[`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md)** — tokens, components, when to add variants.

Per-package conventions live in `api/AGENTS.md` and `web/AGENTS.md`.

## Stack

- **API:** Hono + Postgres (`pg`) + TypeScript. No ORM.
- **Web:** Next.js 15 (App Router) + Tailwind + shadcn/ui.
- **Auth:** `bcryptjs` for passwords, `jose` for JWT, refresh cookies (httpOnly).
- **Tests:** Vitest (unit, in-process via `app.request()`), Playwright (e2e).
- **Monorepo:** npm workspaces.

## Workflow for non-trivial changes

Before implementing anything beyond a typo fix:

1. **Plan.** What does it do? UI/UX, API calls, edge cases, file list, sequence.
2. **TDD.** Write failing tests first. Then make them pass.

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

## README and site stay in sync

If `site/` exists, `README.md` and `site/index.html` describe the same product. When you change a claim, command, step, or feature list in one, change the other in the same commit. README is the source of truth. Every claim on either must be true of the code today; check it before you write it.

## Session logging

**Append to [`docs/ITERATIONS.md`](./docs/ITERATIONS.md)** after every non-trivial change: what changed, why, and what a future session needs to know.

## When in doubt

- Build only what the prompt asks for. If you finish early, write tests instead of starting the next feature.
- Read the per-package `AGENTS.md`.
- Don't write comments that explain *what* the code does. Code does that. Comments are for *why* — non-obvious constraints, workarounds, surprising behavior.
