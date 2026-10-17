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

## 2026-10-17 — README rewritten for a public launch
**What:** Rebuilt README.md: centered hero with the tagline, nav links, a "Left alone, your agent writes / seriousvibes ships / Where" table as the differentiator, three-step how-it-works, quickstart via `npx degit`, opinions, left out on purpose, who it's for, contributing.
**Why:** The README wasn't ready for a public repo. The old README opened with a stack list and never showed the mechanism. The agent-mistake table makes the pitch concrete and links every claim to its doc.
**Result:** Every claim was checked against code: 24 tests in 418ms, auth is about 220 lines (jwt, passwords, refresh, middleware). "Leak test for every route" was an overclaim (no non-member tests on PATCH or `/api-key`), so it's now phrased as the rule. `degit` and "Open an issue" only work once the repo is public (it's private and not a template as of 2026-10-17). Blocker before going public: `api_keys.key` is stored raw and `GET /api/workspaces/:id/api-key` returns it. Hash it the way refresh tokens are. The README names no internal projects and tells no internal history; keep it that way.
