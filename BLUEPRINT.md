# BLUEPRINT

The build sequence that doesn't create rework.

## The meta-rule

> Every phase that runs ahead of its dependencies costs you rework equal to (things built) × (things that changed).

When you build content before the differentiator exists, every word becomes wrong when you find it. When you build features before the schema is right, every endpoint becomes a migration when you fix it. When you ship UI before the design system, every component needs a retrofit.

Sequence is cheaper than quality. Quality you can iterate; sequence you cannot un-do.

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
- Pluck shipped 40 use case pages, 7 comparison pages, and a blog before probes (the differentiator) existed. Every page had to be rewritten after.

## Phase 3 — Tokens, copy guide, CLAUDE.md

**Output:** three documents that constrain every future decision.

- **Design tokens** (`web/src/app/globals.css`) — semantic CSS custom properties. Never reference raw colors. Change one token, everything updates.
- **Copy guide** (`COPY_GUIDE.md`) — voice, tone, banned words, AI-overclaiming rules, error message patterns. Every piece of UI text references it.
- **CLAUDE.md** (root + per-package) — stack decisions, conventions, where to find docs. AI agents read this before they write.

**Why now, not later?** Because everything you write between now and "later" gets retrofitted. Pluck did the audit-everything pass — banned words removed, AI overclaiming corrected, error messages made specific — across 38 surfaces. Hundreds of edits. Could have been zero.

## Phase 4 — Core loop (end-to-end, in real users' hands)

**Output:** one feature, working from "user lands" to "user gets value," with real users.

- Build the *minimum* path. If it's a form product, that's create → share → fill → see response. Not auth flows, not settings, not pricing.
- Test with TDD from the first endpoint. Cost is near-zero now, infinite later.
- Show it to two users. If they're confused, fix the loop, not the marketing.
- Pluck users found that AI agents were just showing empty forms — the core loop was broken. We learned this from real users in week three. We could have learned it in week one.

**Don't:** build admin pages, comparison pages, blog posts, pricing. None of those help you find PMF.

## Phase 5 — Go-to-market content

**Output:** landing page, use cases, comparisons, blog. Written *once*, with the copy guide.

- Now that positioning is locked, the differentiator works, and the product has real users — write the content.
- Use the copy guide. AI agents will produce mush if you let them. Constrain them.
- Lead with the differentiator. Pluck's landing page used to lead with "AI can fill it" — generic. The probes-led version is specific.

## Phase 6 — Operations

**Output:** admin tooling, pricing, metering, team management.

- Build when you have users who need it. Not before.
- Pluck built suspend/delete, usage tracking, and a tabbed admin dashboard in week six. We had four total users. None of them needed any of it.

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
