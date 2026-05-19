import pg from 'pg'

const { Pool } = pg

const url = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/seriousvibes'

const needsSsl = /sslmode=require|[?&]ssl=true/i.test(url)

export const pool = new Pool({
  connectionString: url,
  max: 10,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 10_000,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
})
