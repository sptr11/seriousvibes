# seriousvibes

> A serious starter for vibe coders. Ship engineered products with less churn.

**The problem:** AI agents can write 10,000 lines of code in an afternoon. But what they ship — copy that overclaims, schemas you'll rewrite next month, auth that leaks data across tenants, UI that needs a retrofit when you finally adopt a design system, tests written after the bugs ship — looks like a product but costs more to fix than to rebuild.

**The fix:** Start with the decisions that compound. seriousvibes bundles the foundation you'd otherwise discover the hard way: multi-tenant auth, design tokens, copy guides, TDD scaffolding, security-first defaults. Day one looks like day ninety should have.

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

**Sequence matters more than quality.** Pluck (the project this distills lessons from) shipped a beautiful design system, then discovered it broke the live form renderer. Wrote 40 use cases, then realized none of them mentioned the differentiator. Built admin tooling before the core product worked end-to-end. Each piece was good; the order was expensive.

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

Will be MIT once stable. Private during iteration.

---

Made by someone who shipped the long version.
