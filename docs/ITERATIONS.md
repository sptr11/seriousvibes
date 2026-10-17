# ITERATIONS.md

Running log of every meaningful change to the seriousvibes starter — what was done, why, and what we learned.
Add an entry every time you ship something non-trivial. Newest first.

Format:

```
## YYYY-MM-DD — Title
**What:** What changed.
**Why:** Why we did it — the problem it solved or the decision it captured.
**Result:** What happened, edge cases found, anything a future session needs to know.
```

## 2026-10-17 — BLUEPRINT.md removed
**What:** Deleted `BLUEPRINT.md`. Its one practical rule (build only what the prompt asks for, write tests if you finish early) is now in the root `CLAUDE.md` under "When in doubt". The README's nav link, table row, agent step 3 and "Not included" pointer no longer reference it. The landing page footer now reads "built with seriousvibes."
**Why:** It was founder strategy (positioning lock, go-to-market) in a code starter, and it rested on internal anecdotes a public reader can't check. It also contradicted the starter: Phase 2 said to build the differentiator before auth, but auth ships pre-built.
**Result:** The essay is saved as a Hugo draft (`draft: true`, uncommitted) at `ss_blog/sptr11.github.io/content/journal/build-order.md`. Earlier ITERATIONS entries still mention BLUEPRINT as history. The workspace workflow principle only says "if the project has one", so it needed no change.

## 2026-10-17 — API keys hashed at rest, shown once (#1)
**What:** `api_keys` stores `key_hash` (sha-256) and `key_prefix` (11 chars) instead of the raw key. New `auth/api-keys.ts` generates `pk_` + 32 random bytes. The middleware hashes the bearer token before lookup. `GET /api/workspaces/:id/api-key` returns `{ api_key: { prefix, created_at } | null }`. New `POST` on the same path (owner/admin) creates or replaces the key in one statement (a `DELETE` CTE plus `INSERT`) and is the only response with the raw key. Signup and workspace creation no longer mint a key. The settings page shows the prefix with a "create key" or "replace key" button, and shows the raw key once with a copy button. README gained a "Make it yours" section (name, CLAUDE.md, copy guide, tokens, tests, production settings).
**Why:** A database or backup leak exposed every workspace's key, and the GET route returned it on every call. This blocked making the repo public. Auto-minted keys were dropped because nobody could ever see them once they were hashed.
**Result:** 12 new tests, written red first (36 total, 414ms). Migration verified against a real Postgres: an old-schema database with a raw key upgraded twice, the backfilled hash matched Node's sha256, the old key still authenticated, and a fresh database migrated twice. The uniqueness constraint is named `api_keys_key_hash_key` on both paths. Ran a Playwright check of the settings flow (create, reload shows prefix only, replace issues a new key) against a scratch database. It wasn't committed because the e2e suite has no database harness. Visual QA caught `.t-mono` uppercasing the key, a pre-existing bug that would have broken hand-copied keys. The key display now overrides it with `normal-case tracking-normal`. Known gap, not fixed: a key with a null `created_by` (its creator was deleted) passes the middleware, but every workspace route requires `user`, so it gets 401.

## 2026-10-17 — README rewritten for a public launch
**What:** Rebuilt README.md: centered hero with the tagline, nav links, a "Left alone, your agent writes / seriousvibes ships / Where" table as the differentiator, three-step how-it-works, quickstart via `npx degit`, opinions, left out on purpose, who it's for, contributing.
**Why:** The README wasn't ready for a public repo. The old README opened with a stack list and never showed the mechanism. The agent-mistake table makes the pitch concrete and links every claim to its doc.
**Result:** Every claim was checked against code: 24 tests in 418ms, auth is about 220 lines (jwt, passwords, refresh, middleware). "Leak test for every route" was an overclaim (no non-member tests on PATCH or `/api-key`), so it's now phrased as the rule. `degit` and "Open an issue" only work once the repo is public (it's private and not a template as of 2026-10-17). Blocker before going public: `api_keys.key` is stored raw and `GET /api/workspaces/:id/api-key` returns it. Hash it the way refresh tokens are. The README names no internal projects and tells no internal history; keep it that way.
