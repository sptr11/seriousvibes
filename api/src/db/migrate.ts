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
  key_hash text UNIQUE NOT NULL,
  key_prefix text NOT NULL,
  label text NOT NULL DEFAULT 'Default',
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Databases created before keys were hashed have a raw "key" column. Hash it, then drop it.
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hash text;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix text;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'api_keys' AND column_name = 'key'
  ) THEN
    UPDATE api_keys
      SET key_hash = encode(digest(key, 'sha256'), 'hex'), key_prefix = left(key, 11)
      WHERE key_hash IS NULL;
    ALTER TABLE api_keys DROP COLUMN key;
    ALTER TABLE api_keys ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);
  END IF;
END $$;
ALTER TABLE api_keys ALTER COLUMN key_hash SET NOT NULL;
ALTER TABLE api_keys ALTER COLUMN key_prefix SET NOT NULL;

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
