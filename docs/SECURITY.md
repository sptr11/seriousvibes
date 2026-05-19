# SECURITY.md

Security defaults that ship with seriousvibes, and what you must not break.

## Authentication

### Passwords
- Hashed with `bcryptjs`, cost factor 10.
- Never stored, never logged, never returned in API responses.
- Minimum 8 characters (enforced in Zod schema).

### Tokens
- **Access token:** JWT signed with `JWT_SECRET` (HS256), 1 hour TTL. Sent in `Authorization: Bearer <token>`.
- **Refresh token:** Random opaque string, 7 day TTL, stored in DB. Set as `httpOnly` `Secure` `SameSite=Lax` cookie. Client cannot read it.
- **API key:** Prefix `pk_` + random. Workspace-scoped. Set in `Authorization: Bearer pk_...`.

The auth middleware accepts both JWT and API key paths. A token starting with `pk_` is looked up directly. Anything else is verified as JWT.

### Cookie config
```ts
res.headers.append('Set-Cookie', `refresh=${token}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=604800`)
```

`Secure` is on in production. Use `SameSite=Lax` (not `None`) unless you have a cross-site reason.

## Multi-tenancy

**This is the most-broken thing in vibe-coded SaaS.** Every authenticated query in this project includes `workspace_id = $n`. The middleware resolves it from:

1. The JWT user's `X-Workspace` header (validated against memberships).
2. Falls back to the user's first workspace.

After middleware runs, route handlers do:

```ts
const workspace = c.get('workspace')
const { rows } = await pool.query(
  'SELECT * FROM forms WHERE id = $1 AND workspace_id = $2',
  [id, workspace.id]
)
```

**Never** query a workspace-scoped table without `workspace_id` in the WHERE clause. The schema does not enforce this — your code must.

## SQL injection

- **Always parameterized.** `pool.query('SELECT * FROM users WHERE id = $1', [id])`.
- **Never string-concatenate user input.** Not even for table names — use an enum and validate.
- Zod validates the *shape* of input. Parameterization prevents injection. You need both.

## Input validation

Every route body is validated with Zod *before* the handler runs:

```ts
const SignupSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
})

app.post('/api/auth/signup', async c => {
  const body = SignupSchema.safeParse(await c.req.json())
  if (!body.success) return c.json({ error: body.error.flatten() }, 400)
  // ... safe to use body.data
})
```

This catches: missing fields, wrong types, oversized payloads, malformed emails. Trust `body.data`, don't re-check shape.

## Secrets

- **Never commit `.env`.** It's in `.gitignore`. `.env.example` shows the shape.
- `JWT_SECRET` must be ≥32 random bytes in production. The `migrate` script refuses to run with the default.
- Secrets are read from `process.env` only in `api/src/db/client.ts` and `api/src/auth/jwt.ts`. Don't sprinkle `process.env` access through the codebase.

## CORS

API CORS is restricted to the web origin via `CORS_ORIGIN` env var. Default development is `http://localhost:3000`. Production must set this explicitly.

## Rate limiting

Not bundled. Add `hono-rate-limiter` or put Cloudflare/Vercel in front. Login and signup endpoints are the priority.

## Suspended workspaces

A workspace can be `status = 'suspended'`. The auth middleware rejects requests for suspended workspaces with `403`. Use this for billing failures or abuse without deleting data.

## What this starter does NOT include

- **2FA.** Add it after PMF if you need it.
- **Session revocation list.** Refresh tokens are stored in DB and can be deleted to log a user out.
- **Audit log.** Add it when compliance demands it.
- **CSP headers.** Configure in `next.config.ts` when going to production.
- **OWASP scanner integration.** Run `npm audit` and Snyk separately.

## Pre-commit checklist

When you change auth, schema, or middleware:

- [ ] Tests cover the new path (especially failure cases — wrong workspace, expired token).
- [ ] No `console.log` with token, password, or PII.
- [ ] Workspace check is in the query, not just the route guard.
- [ ] Zod schema added/updated for any new request body.
- [ ] `.env.example` updated if a new secret was added.
