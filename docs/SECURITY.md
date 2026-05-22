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

## Role-gated UI

**API-level RBAC is not enough.** If a member can see a button, they'll click it. Getting a 403 in the UI is a broken experience, not a security measure.

Derive a single role flag once, close to the top of the component:

```ts
const myRole = members.find(m => m.email === user?.email)?.role
const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin'
```

Then use it to branch the UI — don't repeat the check:

```tsx
{isOwnerOrAdmin ? (
  <button onClick={saveWorkspace}>save changes</button>
) : (
  <p className="text-muted">only owners and admins can change workspace settings.</p>
)}
```

For inputs that show current state but shouldn't be editable:

```tsx
<Input
  value={workspaceName}
  onChange={e => setWorkspaceName(e.target.value)}
  disabled={!isOwnerOrAdmin}
/>
```

The pattern: members see the values (useful info), can't change them, and get a clear explanation — not a silent 403.

**What to gate:**
- Workspace name/handle edits
- Domain auto-join toggle
- Member invite and remove
- Data export
- API key creation for others
- Any destructive action

The API must still enforce these. UI gating is for UX; API enforcement is for security. Both are required.

## Third-party auth (WorkOS)

Rolling your own auth (bcrypt + JWT, as this starter ships) is correct for prototypes. For production, replace it with a managed provider once you have real users.

**Why:** Password reset, email deliverability, magic links, OAuth providers, MFA, brute-force protection, and session management are solved problems. They are not your differentiator. Getting any one of them wrong costs you users and possibly a breach.

**WorkOS** handles credential storage, email delivery, and OAuth. Your JWT and refresh token system stays unchanged — WorkOS is just the credential verification layer. The integration point is a single `issueSession()` function that WorkOS calls after verifying credentials, and you create-or-update the user in your DB and issue your own tokens.

```ts
// workos verifies → you issue
async function issueSession(workosUser: { id: string; email: string }) {
  const user = await upsertUser(workosUser)
  const accessToken = await signAccessToken(user.id)
  c.header('Set-Cookie', refreshCookie(raw))
  return c.json({ token: accessToken, user, workspaces })
}
```

Your downstream code never changes — it still gets a JWT and a refresh cookie.

**Auto-join by domain:** When a new user signs up with a business email (e.g. `@acme.com`), automatically join them to the team workspace:

```ts
const domain = domainFromEmail(email)
if (domain) {
  await pool.query(
    `INSERT INTO memberships (user_id, workspace_id, role)
     SELECT $1, w.id, 'member' FROM workspaces w
     WHERE w.auto_join_domain = $2
     ON CONFLICT DO NOTHING`,
    [newUser.id, domain]
  )
}
```

Do this synchronously, before returning the auth response, so the team workspace is in the first response and becomes the default.

Exclude consumer email domains (gmail, yahoo, outlook, etc.) from auto-join. Maintain a list in `lib/consumer-domains.ts`.

## Frontend auth resilience

**The client must recover from token expiry without the user noticing.**

Wrap every authenticated API call in a retry loop:

```ts
async function authedFetch(path: string, opts?: RequestInit) {
  let res = await fetch(path, { ...opts, headers: authHeaders() })
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (!refreshed) {
      clearSession()
      router.push('/login')
      return res
    }
    res = await fetch(path, { ...opts, headers: authHeaders() }) // retry once
  }
  return res
}
```

**Boot from cache, not from the network.** Hydrate the auth state from `localStorage` on mount — the user sees the correct UI immediately:

```ts
const stored = localStorage.getItem('user')
if (stored) setState({ user: JSON.parse(stored), loading: false })
```

Then validate the token in the background. If it's expired, the first `authedFetch` call triggers the refresh loop above.

**Workspace fallback.** If the stored workspace ID no longer exists (deleted, removed from membership), fall back to the first available workspace rather than crashing:

```ts
const active = workspaces.find(w => w.id === storedId) ?? workspaces[0] ?? null
```

**Don't assume `localStorage` is available.** Private browsing in some browsers throws on storage access. Wrap all reads and writes in try/catch.

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
