# seriousvibes

A Next.js 15 + Hono + Postgres starter for people using AI agents to write their SaaS. Multi-tenant auth, design tokens, a copy guide, and TDD scaffolding are already built, so the first thing your agent generates isn't the tenth thing you have to fix.

Left to itself, an agent will write auth that leaks across tenants, a schema you rewrite next month, copy that overclaims, and tests written after the bugs already shipped — all in code that looks done. Every one of those is cheap to prevent up front and expensive to fix after. This starter bakes the prevention in so day one already looks like day ninety.

## What's in the box

- **API** — Hono + Postgres + TypeScript, JWT + API key auth, workspace-scoped from day one
- **Web** — Next.js 15 + Tailwind + shadcn/ui with semantic tokens, not raw colors
- **Tests** — Vitest with mocked pool + Hono's `app.request()` (no test server), Playwright for E2E
- **Security** — bcrypt, parameterized queries, Zod input validation, httpOnly refresh cookies, workspace-isolation enforced in middleware
- **Docs** — `BLUEPRINT.md` (build sequence), `SECURITY.md`, `TESTING.md`, `COPY_GUIDE.md`, `DESIGN_SYSTEM.md` — all referenced from `CLAUDE.md` so AI agents read them before they write
- **Conventions** — `CLAUDE.md` files at root and per-package, telling any agent how to behave in your codebase

## Quick start

```bash
git clone <your-fork> myapp && cd myapp
npm install
cp .env.example .env  # set DATABASE_URL and JWT_SECRET
npm run migrate -w api
npm run dev           # api on 3001, web on 3000
```

Run tests:

```bash
npm test              # unit (vitest) — runs in <1s
npm run test:e2e -w web  # e2e (playwright)
npm run typecheck     # tsc --noEmit everywhere
```

## The philosophy

**Sequence matters more than quality.** We've seen projects ship a beautiful design system, then discover it broke the live renderer. Write 40 use cases, then realize none of them mention the differentiator. Build admin tooling before the core product works end-to-end. Each piece was good; the order was expensive.

The cheap ordering — positioning → differentiator → tokens + copy guide → core loop → content — is what this starter encodes.

**Read [`BLUEPRINT.md`](./BLUEPRINT.md) first.** It's the most important file here.

## What's opinionated

- **No ORM.** Raw SQL with `pg`. Migrations are idempotent SQL strings. You can debug a query in 10 seconds.
- **No auth service.** ~150 lines of `bcrypt` + `jose`. You own the token lifetime, refresh logic, and revocation.
- **No CSS-in-JS.** Tailwind + CSS custom properties. Change a token, everything updates.
- **No monorepo framework.** npm workspaces. `npm run dev` starts both packages.
- **TDD by default.** Tests live next to source. Mock `pool.query`, call `app.request()`, assert. <1s test runs.
- **Workspaces from day one.** Every authenticated query is scoped. No retrofit.

## What's missing on purpose

- Marketing pages, comparison pages, blog. **Build them after you have users.**
- Pricing/metering. **Build it after you have customers.**
- Admin dashboards. **Build it when you need to operate.**
- A logo. **You'll change it three times anyway.**

## License

MIT
