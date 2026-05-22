# DEPLOYMENT.md

Getting code to production and keeping it there. These patterns apply whether you're on Render, Railway, or Fly.

---

## Single-service deployment

Run the API and the Next.js frontend as one service, not two.

**Why:** Two services on a free tier means two cold starts, two sets of env vars to keep in sync, and two failure surfaces. The API crashing silently takes the product down while the marketing page stays up — users see a working site that doesn't work. Render, Railway, and Fly all support running multiple processes in one service.

**Start command pattern:**

```
node api/dist/index.js & cd web && npx next start -p $PORT -H 0.0.0.0
```

- The `&` backgrounds the API process. Next.js runs in the foreground.
- The host process Render/Railway watches is Next.js on `$PORT`. If it exits, the service restarts.
- The API binds a fixed internal port (`API_PORT=3001`). Next.js proxies to it via rewrites.
- `NODE_VERSION` is pinned in the service config, not assumed.

**Never fall back to `process.env.PORT` in the API:**

```ts
// api/src/index.ts — correct
const port = Number(process.env.API_PORT ?? 3001)

// WRONG — caused a production outage
const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001)
```

`PORT` is Render's dynamic external port, set for Next.js. If `API_PORT` is not in your env vars (it shouldn't need to be — 3001 is the right default), falling back to `PORT` causes the API to race Next.js for the same port. Next.js usually wins (it starts after migrate.js finishes), the API crashes with `EADDRINUSE`, and every proxy returns 500 while the container stays "healthy".

**Port discipline:**

```ts
// next.config.ts
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? `http://localhost:${apiPort}`

async rewrites() {
  return [
    { source: '/api/:path*', destination: `${apiBase}/api/:path*` },
    { source: '/health',     destination: `${apiBase}/health` },
  ]
}
```

On the server, `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`. The browser never sees this URL — it always calls relative `/api/*` paths. The `NEXT_PUBLIC_` prefix is a misnomer here; this value is only read by `next.config.ts` at build/runtime on the server. Don't put secrets in `NEXT_PUBLIC_` variables — they end up in the browser bundle.

---

## Migration resilience

**Never let a migration failure prevent the API from starting.**

The default pattern — `node migrate.js && node index.js` — is a trap. If `migrate.js` throws (DB connection timeout, transient network error, anything), the `&&` short-circuits and `index.js` never runs. The service appears live (Next.js is up) but the API is dead. Every request returns 500.

Fix 1 — run migrations inside the API startup, not before it:

```ts
// api/src/index.ts
if (!isTest) {
  import('./db/migrate-run.js')
    .catch(err => {
      console.error('[api] migration failed, starting anyway:', err.message)
    })
    .finally(() => {
      const port = Number(process.env.API_PORT ?? 3001)
      serve({ fetch: app.fetch, port }, info => {
        console.log(`[api] listening on http://localhost:${info.port}`)
      })
    })
}
```

Fix 2 — if you keep a standalone `migrate.js`, make it exit 0 on failure:

```ts
// migrate.ts
runMigrations()
  .then(() => pool.end())
  .catch(err => {
    console.error('[migrate] failed:', err.message)
    pool.end().catch(() => {})
    // No process.exit(1) — don't break the && chain
  })
```

Both fixes together: the API starts on the first attempt. The standalone script still handles cold schema creation in CI.

**Migrations must be idempotent.** Every DDL statement uses `IF NOT EXISTS`. Every data backfill is conditional (`WHERE condition IS NULL` or `ON CONFLICT DO NOTHING`). Running migrations twice must be a no-op.

---

## Health endpoint

Every service needs a health endpoint that confirms **both** processes are alive.

```ts
// api/src/index.ts
app.get('/health', c => c.json({ ok: true }))
```

```ts
// next.config.ts
{ source: '/health', destination: `${apiBase}/health` }
```

`yourapp.com/health` now reaches the API through Next.js. It only returns 200 if both Next.js and the API are running. Monitor this, not the root URL. The root URL returns 200 even when the API is dead.

**Set `healthCheckPath=/health` on the Render service.** Without it, Render only watches whether Next.js is alive. If the API crashes (port conflict, uncaught exception), Next.js stays up, Render thinks the service is healthy, and the broken state persists until a manual restart. With `healthCheckPath=/health`, Render restarts the whole container automatically when the API goes down.

---

## Monitoring

Point your uptime monitor at `yourapp.com/health`, not `yourapp.com`.

On free-tier hosting (Render, Railway free plans): services spin down after ~15 minutes of inactivity. A monitor that checks every 3 minutes serves two purposes: it catches downtime, and it keeps the service warm. Without it, the first real user after idle gets a 30–60 second cold start.

Set the alert threshold to 2–3 consecutive failures before paging. One failure is usually a Render health check during a deploy, not a real outage.

---

## Environment variables

| Variable | Where it lives | Notes |
|---|---|---|
| `DATABASE_URL` | Render secret | Never in repo. `sync: false` in render.yaml. |
| `JWT_SECRET` | Render secret | ≥32 random bytes. Migration refuses to run with the default. |
| `NODE_ENV` | Render env | `production` in prod. Guards migration JWT check. |
| `API_PORT` | Render env (non-secret) | Fixed at `3001`. Never use `PORT` for the API — Render assigns that to the web process. |
| `NEXT_PUBLIC_API_BASE_URL` | Render env | `http://localhost:3001` for co-located deployments. Used only in `next.config.ts` rewrites. |
| `CORS_ORIGIN` | Render env | Comma-separated list of allowed origins. Must include the production URL. |

`render.yaml` is source-of-truth for build/start commands and non-secret env vars. Secret env vars use `sync: false` — they're set once in the dashboard and never overwritten by YAML deploys.

**Render YAML does not update an existing service's start command.** If you change `startCommand` in `render.yaml` on an existing service, it has no effect. Update it via the dashboard or the API (`PATCH /v1/services/:id` with `envSpecificDetails.startCommand`). Keep `render.yaml` accurate anyway — it documents intent and bootstraps new environments.

---

## Database

- **Neon** (serverless Postgres) works well for zero-to-one projects. The free tier has no always-on compute charge.
- Set `sslmode=require` in the connection string. The `pg` library currently treats this as `verify-full`. If you get a deprecation warning, you can be explicit with `sslmode=verify-full` — behavior is identical today.
- Avoid `channel_binding=require` unless your hosting provider requires it. It adds a SCRAM channel binding round-trip that can time out on cold connections.
- The connection pool (`pg.Pool`) handles reconnect automatically. You don't need retry logic in the application layer.

---

## Pre-deploy checklist

- [ ] `npm run typecheck` passes in both packages.
- [ ] `npm test` passes.
- [ ] `render.yaml` build/start commands match what's in the dashboard.
- [ ] `NEXT_PUBLIC_` variables contain no secrets.
- [ ] `CORS_ORIGIN` includes the production domain.
- [ ] Health endpoint returns 200 after deploy.
