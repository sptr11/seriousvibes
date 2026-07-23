# DESIGN_SYSTEM.md

Tokens, not raw colors. Variants, not one-offs.

## How tokens work

All design values live as CSS custom properties in `web/src/app/globals.css`. Tailwind references them via `tailwind.config.ts`, so you use semantic classes (`bg-bg`, `text-fg`, `border-rule`, `bg-accent`) instead of raw values.

Color tokens are stored as bare RGB triples — Tailwind composes the `rgb()` wrapper and alpha channel at build time.

**The rule:** reference tokens, not raw values. Never `bg-blue-500`. Never inline hex. When the brand changes, you change one line in `globals.css` and the entire app updates.

## Default palette

The default is a light, high-contrast palette with colorful accents. Swap the token values to make it yours:

- `--color-bg` — warm off-white base
- `--color-fg` — near-black text for strong contrast
- `--color-accent` — coral primary action color
- `--color-pos` / `--color-neg` — teal for success, coral for error
- `--color-card` / `--color-popover` — white elevated surfaces
- `--color-muted` — dark secondary text (readable against the light background)
- `--color-rule` — visible borders and dividers

## Typography — not a token, unlike color

The font pairing is a deliberate signature, not a swappable value: **Geist** for body/UI text, **Geist Mono** for labels (`.t-mono`), and **Instrument Serif italic** for emphasis words inside headlines (`font-serif italic` — see the homepage `h1`). Sans body + italic-serif accent is the one visual choice in this system that isn't behind a CSS variable.

That means it doesn't follow the "change one line in `globals.css`" promise above. To replace it:

1. Swap the `next/font/google` imports in `web/src/app/layout.tsx` (currently `Geist`, `Geist_Mono`, `Instrument_Serif`).
2. Update the `fontFamily` mapping in `tailwind.config.ts` if the CSS variable names change.
3. Grep for `font-serif italic` — every place a headline mixes in the serif accent has that class hardcoded, not a token, so each one needs a look.

If you keep the palette but want a plainer type system, cutting the serif import and the `font-serif italic` spans is the fastest way to de-signature this without touching color tokens.

## Adding to the system

The pattern is: **token first, then class, then variant**.

1. Add the token in `globals.css` (semantic name, not visual — `--color-accent`, not `--color-coral`)
2. Expose the class in `tailwind.config.ts` (referencing the token)
3. Add the variant in the component (if it's a reusable shape)

Never:
- Hardcode a hex value in JSX.
- Use `style={{ background: '#...' }}`.
- Use `!important`.
- Create a new color that "almost matches" an existing one. Use the existing one or add a token.

## Components

All from shadcn/ui, customized via CVA. Each lives in `web/src/components/ui/`.

Bundled:
- `Button` — variants: `primary`, `outline`, `ghost`, `destructive`
- `Card` — variants: `flat`, `raised`, `stamp` (`stamp` — a solid `--color-fg` border plus a coral-tinted ring shadow via `--shadow-stamp` — is the app's default look for prominent cards: login, dashboard, homepage tiles. It's a signature, not a neutral container. Use `flat` or `raised` if you want the card itself to stay out of the way.)
- `Input`, `Label`, `Textarea`
- `Badge` — variants: `default`, `accent`, `pos`, `neg`, `quiet`
- `Dialog`, `Dropdown`
- `Skeleton`
- `Toaster` (Sonner)

**Adding a variant:** edit the CVA definition in the component file. Don't add a new component for a slight visual change.

**Adding a component:** add the file to `web/src/components/ui/`, then adjust to match the token vocabulary.

## When you redesign

You will. Every product redesigns. The point of tokens is that you can.

- Change the token values in `globals.css`.
- The entire app updates.
- You don't have to grep for hex codes across 47 files.
