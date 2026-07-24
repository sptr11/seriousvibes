# BLUEPRINT

The build sequence that doesn't create rework.

## The meta-rule

> Every phase that runs ahead of its dependencies costs you rework equal to (things built) × (things that changed).

Build content before the differentiator exists, and every word becomes wrong the moment you find it. The anti-patterns table below has six more, with the real cost of each.

Sequence is cheaper than quality. Quality you can iterate; sequence you cannot undo.

## The cheap ordering

```
1. Positioning lock
2. Differentiator (real, demoable)
3. Tokens + copy guide + CLAUDE.md
4. Core loop (one feature, end-to-end, in real users' hands)
5. Go-to-market content
6. Operations (admin, pricing, metering)
```

Skip any step and you'll redo work in every step after it.

## Phase 1 — Positioning lock (no code)

**Output:** one sentence on who it's for, what they get, why it's different.

- The differentiator must be *demoable*, not just a positioning claim. "It's faster" is not a differentiator. "It interviews respondents with follow-up questions" is.
- Lock the language now. Every page, every doc, every error message will inherit it.
- If you can't write the sentence, you can't write the product.

**Don't:** write marketing copy, design a logo, register social handles. None of those are positioning.

## Phase 2 — Differentiator (real, demoable)

**Output:** a working prototype of the thing that makes you different.

- Build this *before* anything else, including auth, if you can fake the rest.
- Test it on a real person. If they don't see the difference, the positioning is wrong — back to Phase 1.
- A real project shipped 18 use case pages before the differentiator existed. Every page had to be rewritten after — see the anti-patterns table.

## Phase 3 — Tokens, copy guide, CLAUDE.md

**Output:** three documents that constrain every future decision.

- **Design tokens** (`web/src/app/globals.css`) — semantic CSS custom properties. Never reference raw colors. Change one token, everything updates.
- **Copy guide** (`COPY_GUIDE.md`) — voice, tone, banned words, AI-overclaiming rules, error message patterns. Every piece of UI text references it.
- **CLAUDE.md** (root + per-package) — stack decisions, conventions, where to find docs. AI agents read this before they write.

**Why now, not later?** Because everything you write between now and "later" gets retrofitted. One project did the audit-everything pass — banned words removed, AI overclaiming corrected, error messages made specific — across 38 surfaces. Hundreds of edits. Could have been zero.

## Phase 4 — Core loop (end-to-end, in real users' hands)

**Output:** one feature, working from "user lands" to "user gets value," with real users.

- Build the *minimum* path. If it's a form product, that's create → share → fill → see response. Not auth flows, not settings, not pricing.
- Test with TDD from the first endpoint. Cost is near-zero now, infinite later.
- Show it to two users. If they're confused, fix the loop, not the marketing.
- Real users found the core loop was broken — AI agents were just showing empty forms. Discovered in week three. Could have been week one.

**Don't:** build admin pages, comparison pages, blog posts, pricing. None of those help you find PMF.

## Phase 5 — Go-to-market content

**Output:** landing page, use cases, comparisons, blog. Written *once*, with the copy guide.

- Now that positioning is locked, the differentiator works, and the product has real users — write the content.
- Use the copy guide. AI agents will produce mush if you let them. Constrain them.
- Lead with the differentiator. A landing page that leads with "AI can fill it" is generic. One that leads with the specific mechanism is not.

## Phase 6 — Operations

**Output:** admin tooling, pricing, metering, team management — and production infrastructure that holds under real use.

- Build operations tooling when you have users who need it. Not before.
- One project built suspend/delete, usage tracking, and a tabbed admin dashboard in week six. Four total users. None of them needed any of it.
- **Do** set up deployment infrastructure at Phase 6. Not monitoring in the abstract — a specific health endpoint, a specific uptime check, a specific alert. Read [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) before shipping Phase 4 to real users.

## Anti-patterns (things we did, you shouldn't)

| Anti-pattern | Cost | Fix |
|---|---|---|
| Rewriting the hero headline 4 times | Cascades to OG meta, use cases, comparisons, blog | Lock positioning before writing any copy |
| Retrofitting design tokens after building UI | Broke live form renderer, required full audit | Tokens before first component |
| Auditing copy after writing 100s of lines | Hundreds of edits across 38 surfaces | Copy guide before first piece of UI text |
| Building 18 use case pages before the differentiator existed | Every page had to be rewritten | Differentiator first, content informs it |
| Schema rewrite (accounts → users + workspaces) at week 8 | Touched every route | Multi-tenancy from day one |
| Pricing/metering at week 6 with 4 users | Wasted work, none of it shipped to a real customer | Operations after PMF, not before |
| Marketing pages before the loop worked | Real users found a broken agent experience while we polished the comparison table | Real users on the loop first |

## How to use this blueprint with an AI agent

The agent will want to skip ahead. It will offer to "also" build the landing page when you ask for auth. It will write five comparison pages when you ask for one use case. **Say no.**

Tell the agent: "Phase N only. Do not start Phase N+1. If you finish early, write tests."

The agent reads `BLUEPRINT.md` from `CLAUDE.md`. Reference the phase number in every prompt.

## What "done" looks like for each phase

- **Phase 1:** A sentence you'd defend in front of a customer.
- **Phase 2:** A demo that makes someone go "oh."
- **Phase 3:** Three docs (`globals.css`, `COPY_GUIDE.md`, `CLAUDE.md`) that you read before every change.
- **Phase 4:** Two non-team users have used it end-to-end.
- **Phase 5:** A landing page that mentions the differentiator in the first sentence.
- **Phase 6:** A real user asked for the thing you built.
