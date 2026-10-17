# AGENTS.md — web

## Stack
- Next.js 15 (App Router) + React 19
- Tailwind 3 with semantic tokens (see `docs/DESIGN_SYSTEM.md`)
- shadcn-pattern UI in `src/components/ui/` — written directly, no CLI
- Sonner for toasts, Radix primitives for dialog / dropdown / label

## Rules

- **Tokens, never raw colors.** Use `bg-bg`, `text-fg`, `border-rule`, `bg-accent`. Never `bg-yellow-300`. Never inline hex.
- **`<Button>` over `<button>`.** Always import from `@/components/ui/button`. Same for `Input`, `Label`, `Card`, `Badge`, `Dialog`, `DropdownMenu`.
- **Copy follows `docs/COPY_GUIDE.md`** — specific, dry, sentence case, no banned words, no exclamation points. Re-read before writing user-facing strings.
- **Auth via `useAuth()`.** Never raw `fetch` with manual `Authorization` headers in pages. Use `authedFetch()` from `useAuth()` — it handles the token, the workspace header, and the 401 → refresh → retry path.
- **Server components by default.** Only mark `'use client'` when you actually need state, effects, browser APIs, or context. The landing page is server; everything in `/dashboard` and `/login` is client.

## Layout structure

- `app/layout.tsx` — server component. Loads fonts via `next/font`. Wraps in `<Providers>` (client) which provides Auth + Toaster.
- `app/page.tsx` — server, public landing.
- `app/login/page.tsx` — client, signup/signin toggle.
- `app/dashboard/` — client, authenticated area. Redirects to `/login` if unauthenticated.
- `app/error.tsx`, `app/global-error.tsx`, `app/dashboard/error.tsx` — error boundaries that prevent white-screens.

## Design tokens

Defined in `src/app/globals.css` as RGB triples — Tailwind composes alpha. See `docs/DESIGN_SYSTEM.md` for the token workflow. Read `globals.css` for the current token names and values.

## API base URL

Dev: Next rewrites `/api/*` and `/health` to `http://localhost:${API_PORT ?? 3001}`. Production: set `NEXT_PUBLIC_API_BASE_URL` for the deployed API origin and Next will rewrite to it.

The web code always calls `/api/...` paths. Never hard-code the API origin in components.

## Testing

- Type-check: `npm run typecheck` (must stay clean — `noUncheckedIndexedAccess` is on).
- E2E: `npm run test:e2e`. One spec covers the landing → login route.
- Component unit tests are intentionally omitted — visual review + types catch most of it. Test behavior end-to-end with Playwright when a flow becomes load-bearing.

## Conventions

- File names: kebab-case for non-component files, lowercase paths.
- Imports use the `@/` alias.
- No emojis in source. No exclamation points in copy. No `any`.
- Don't run the shadcn CLI — components live here, edit them directly.
