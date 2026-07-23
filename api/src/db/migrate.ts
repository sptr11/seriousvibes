import { pool } from './client.js'
import { log } from '../lib/logger.js'

const DEFAULT_SECRET = 'change-me-to-a-32-byte-random-string'

const SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY DEFAULT ('u_' || replace(gen_random_uuid()::text, '-', '')),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY DEFAULT ('w_' || replace(gen_random_uuid()::text, '-', '')),
  handle text UNIQUE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS memberships_user_id_idx ON memberships(user_id);
CREATE INDEX IF NOT EXISTS memberships_workspace_id_idx ON memberships(workspace_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS api_keys (
  id text PRIMARY KEY DEFAULT ('key_' || replace(gen_random_uuid()::text, '-', '')),
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key text UNIQUE NOT NULL DEFAULT ('pk_' || replace(gen_random_uuid()::text, '-', '')),
  label text NOT NULL DEFAULT 'Default',
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_keys_workspace_id_idx ON api_keys(workspace_id);
`

async function run(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.JWT_SECRET
    if (!secret || secret === DEFAULT_SECRET) {
      log.error('refusing to run in production with default or missing JWT_SECRET')
      process.exit(1)
    }
  }

  log.info('running migrations')
  await pool.query(SQL)
  log.info('migrations complete')
  await pool.end()
}

run().catch(err => {
  log.error('migration failed', { message: err instanceof Error ? err.message : String(err) })
  process.exit(1)
})
