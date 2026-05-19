# CLAUDE.md — @seriousvibes/api

## Stack

- **Hono** for HTTP, mounted under `/api/*`. `app` is exported from `src/index.ts` for in-process tests.
- **Postgres** via `pg.Pool` from `src/db/client.ts`. No ORM. All SQL is parameterized.
- **jose** for JWTs (HS256, 1h).
- **bcryptjs** for password hashing (cost 10).
- **Zod** for every request body.

## Rules

1. **Workspace scoping is non-negotiable.** Every authenticated query touches workspace_id (directly or via memberships join). `c.get('workspace')` is set by `requireAuth`.
2. **TDD.** Write the test first. Mock `../db/client` and use Hono's `app.request()`. Tests must run in <1s.
3. **No `any`** except when casting `pg` rows; cast through `unknown` then to a typed shape.
4. **Error shape:** `{ error: string, details?: ... }`.
5. **Never log tokens, password hashes, or PII.**
6. **All migrations idempotent** (`CREATE IF NOT EXISTS`). Run via `npm run migrate`.

## Auth model

Two paths through `requireAuth` (`src/middleware/auth.ts`):

- **JWT** (`Authorization: Bearer eyJ...`) — verifies, reads optional `X-Workspace` header (accepts workspace ID or handle), resolves to the user's membership row. Falls back to the user's earliest membership when no header.
- **API key** (`Authorization: Bearer pk_...`) — single JOIN across `api_keys`, `workspaces`, optional `users`/`memberships` via `created_by`. Workspace is scoped by the key, not by header.

After middleware:
- `c.get('user')`: User row, OR `null` when the API key's `created_by` is null.
- `c.get('workspace')`: always set.
- `c.get('membership').role`: real role for JWT; either the creator's role or the synthetic `'api_key'` when no real membership.
- `c.get('authSource')`: `'jwt' | 'api_key'`.

Suspended workspaces return `403` from the middleware itself.

## Refresh tokens

- 32 random bytes (hex). SHA-256 hash stored in `refresh_tokens.token_hash`.
- Cookie: `refresh=<raw>; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=604800`. `Secure` works on localhost in dev.
- Rotated on `/api/auth/refresh` (delete old, insert new).

## Tests

```ts
vi.mock('../db/client', () => ({ pool: { query: vi.fn(), connect: vi.fn() } }))
```

For routes that use `pool.connect()` (signup, workspace create), mock the returned client with `query` and `release`. Route tests also mock `../auth/passwords` to keep bcrypt out of the hot path (bcryptjs at cost 10 is ~80ms per hash — would blow the <1s test budget).

`index.ts` guards `serve(...)` behind `NODE_ENV !== 'test'` so importing `app` in tests doesn't bind a port.

## Conventions / choices

- **Handle validation:** 3–30 chars, lowercase alphanumeric + `-`/`_`, must start with alphanumeric. Reserved: `admin, api, www, root, settings`.
- **X-Workspace header** accepts either workspace ID or handle. Matches the Pluck convention.
- **Signup is transactional** — single `BEGIN/COMMIT` around user + workspace + membership + api key + refresh token inserts.
- **`memberships` lookup** is always filtered by `user_id` first. Never resolve a workspace without the membership join.
- **Migrations** refuse to run in `NODE_ENV=production` with the default `.env.example` `JWT_SECRET`.

## Files

```
src/
  index.ts              Hono app, CORS, route mounts, /health, serve()
  types.ts              AppVariables (Hono context types)
  db/client.ts          pg.Pool (DATABASE_URL, ssl-aware)
  db/migrate.ts         Idempotent SQL migration
  auth/jwt.ts           sign/verify access token (HS256, 1h)
  auth/passwords.ts     bcryptjs hash/verify (cost 10)
  auth/refresh.ts       generate/hash/cookie helpers
  middleware/auth.ts    requireAuth (JWT + API key paths)
  lib/handle.ts         isValidHandle + reserved list
  routes/auth.ts        signup, login, refresh, logout, me
  routes/workspaces.ts  CRUD + members
```
