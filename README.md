<h1 align="center">seriousvibes</h1>

<p align="center"><strong>A serious starter for vibe coders.</strong></p>

<p align="center">A Next.js 15 + Hono + Postgres starter for building multi-tenant SaaS with a coding agent.</p>

<p align="center"><a href="#quickstart">Quickstart</a> · <a href="#whats-included">What's included</a> · <a href="BLUEPRINT.md">Build order</a></p>

---

seriousvibes gives you a working app (auth, workspaces, API keys, tests) and a `CLAUDE.md` that tells your coding agent the project's rules. Every query is scoped to a workspace, tests come first, styles use design tokens, and UI text follows a copy guide. The existing code already follows these rules, so the agent has correct examples to copy.

## What's included

| Problem | What's included | Docs |
|---|---|---|
| Data leaking between tenants | Middleware resolves the workspace. Every query filters on `workspace_id`. Each route must test the cross-workspace case. | [`SECURITY.md`](docs/SECURITY.md) |
| Code shipped without tests | TDD is required by `CLAUDE.md`. Vitest calls routes in-process with Hono's `app.request()`, and the suite runs in under a second. | [`TESTING.md`](docs/TESTING.md) |
| Hardcoded colors | Semantic CSS variables in `globals.css`, mapped into Tailwind classes. | [`DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) |
| Vague UI copy and error messages | A copy guide with banned words, error message patterns and CTA rules. | [`COPY_GUIDE.md`](docs/COPY_GUIDE.md) |
| Deploys that fail silently | Migrations run inside API startup and can't block it. `/health` checks both the API and the web process. | [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) |
| Building features in the wrong order | Six build phases, and what skipping each one costs. | [`BLUEPRINT.md`](BLUEPRINT.md) |

## Using it with an agent

1. Fork the repo.
2. Make sure your agent reads `CLAUDE.md`. Claude Code loads it automatically. For other agents, reference it from their rules file.
3. Name the current phase from `BLUEPRINT.md` in your prompts, for example: "Phase 4 only. Don't start Phase 5. If you finish early, write tests."

## Quickstart

Requires Node 20+ and a Postgres database.

```bash
npx degit sptr11/seriousvibes myapp
cd myapp && git init
npm install
cp .env.example .env     # set DATABASE_URL and JWT_SECRET
npm run migrate
npm run dev              # web on :3000, api on :3001
```

```bash
npm test                 # unit tests (vitest)
npm run test:e2e -w web  # end-to-end tests (playwright)
npm run typecheck
```

## Design choices

- **SQL with `pg`, no ORM.** Queries use `$1` placeholders, and migrations are idempotent SQL. You can paste any query into `psql`.
- **Auth in the repo.** About 220 lines using `bcryptjs` and `jose`: JWT access tokens, httpOnly refresh cookies, API keys. [`SECURITY.md`](docs/SECURITY.md) shows how to swap in a managed provider.
- **Tailwind and CSS variables.** No CSS-in-JS.
- **npm workspaces.** `api/` and `web/`, with no monorepo tool. `npm run dev` starts both.
- **Multi-tenant from the start.** Adding tenancy later means changing every route.

## Not included

- Marketing pages and a blog
- Pricing, billing and usage metering
- Admin dashboards

`BLUEPRINT.md` explains when to add each one.

## Who it's for

Teams and solo developers building a multi-tenant SaaS with a coding agent. For a single-user prototype, `create-next-app` is lighter.

## Contributing

If your agent shipped a bug these rules should have caught, [open an issue](../../issues) describing it.

## License

[MIT](LICENSE)
