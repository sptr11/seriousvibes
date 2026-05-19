# DESIGN_SYSTEM.md

Tokens, not raw colors. Variants, not one-offs.

## Tokens

All design values live in CSS custom properties in `web/src/app/globals.css`. Tailwind references them via the config.

```css
:root {
  /* Color */
  --color-bg: 250 247 238;        /* warm paper */
  --color-fg: 10 10 10;
  --color-rule: 220 215 200;       /* hairline borders */
  --color-accent: 255 233 73;      /* signature highlight */
  --color-accent-fg: 10 10 10;
  --color-muted: 100 95 80;
  --color-pos: 26 167 107;
  --color-neg: 204 68 68;

  /* Radius */
  --radius-1: 4px;
  --radius-2: 8px;
  --radius-3: 12px;
  --radius-pill: 9999px;

  /* Shadow */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-sm: 0 2px 6px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-stamp: 3px 3px 0 rgba(10,10,10,1);  /* signature offset shadow */

  /* Motion */
  --t-fast: 120ms;
  --t-base: 200ms;
  --t-slow: 320ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

**Reference tokens, not raw values.** Never `bg-yellow-300`. Always `bg-accent`. When the brand changes, you change one line.

## Tailwind config

`tailwind.config.ts` exposes tokens as semantic classes:

```ts
theme: {
  extend: {
    colors: {
      bg: 'rgb(var(--color-bg) / <alpha-value>)',
      fg: 'rgb(var(--color-fg) / <alpha-value>)',
      rule: 'rgb(var(--color-rule) / <alpha-value>)',
      accent: { DEFAULT: 'rgb(var(--color-accent))', fg: 'rgb(var(--color-accent-fg))' },
      muted: 'rgb(var(--color-muted) / <alpha-value>)',
      pos: 'rgb(var(--color-pos) / <alpha-value>)',
      neg: 'rgb(var(--color-neg) / <alpha-value>)',
    },
    borderRadius: {
      1: 'var(--radius-1)',
      2: 'var(--radius-2)',
      3: 'var(--radius-3)',
    },
    boxShadow: {
      xs: 'var(--shadow-xs)',
      sm: 'var(--shadow-sm)',
      md: 'var(--shadow-md)',
      stamp: 'var(--shadow-stamp)',
    },
  },
},
```

## Typography

Three faces, mapped to roles:

- **Sans** (default body): Geist Sans
- **Mono** (labels, code, badges): Geist Mono
- **Serif** (accent display only): Instrument Serif italic

Loaded via `next/font` in `app/layout.tsx`. Never `font-family` in CSS — use Tailwind classes.

Type scale in `globals.css`:

```css
.t-display { font-size: clamp(2.5rem, 6vw, 4rem); line-height: 1; letter-spacing: -0.02em; }
.t-h1 { font-size: clamp(2rem, 4vw, 2.75rem); line-height: 1.1; }
.t-h2 { font-size: 1.75rem; line-height: 1.2; }
.t-h3 { font-size: 1.35rem; line-height: 1.3; }
.t-h4 { font-size: 1.05rem; line-height: 1.4; font-weight: 600; }
.t-body { font-size: 0.95rem; line-height: 1.55; }
.t-small { font-size: 0.85rem; line-height: 1.5; }
.t-mono { font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; }
```

## Components

All from shadcn/ui, customized via CVA. Each lives in `web/src/components/ui/`.

Bundled:
- `Button` — variants: `primary`, `outline`, `ghost`, `destructive`
- `Card` — variants: `flat`, `raised`, `stamp`
- `Input`, `Label`, `Textarea`
- `Badge` — variants: `default`, `accent`, `pos`, `neg`, `quiet`
- `Dialog`, `Dropdown`, `Tooltip`
- `Skeleton`
- `Toaster` (Sonner)

**Adding a variant:** edit the CVA definition in the component file. Don't add a new component for a slight visual change.

**Adding a component:** `npx shadcn@latest add <name>`, then adjust to match the token vocabulary.

## Signature element

Pick one. This is the one thing that makes your UI recognizable in a screenshot.

Pluck's was the `--shadow-stamp` offset (a black drop shadow at exactly 3px/3px offset, no blur). Two cards on a landing page with that shadow and you know it's Pluck.

Your signature should be:
- Cheap to apply (one class).
- Recognizable without context.
- Compatible with both light and dark surfaces.

## Adding to the system

The pattern is: **token first, then class, then variant**.

- Token in `globals.css` (semantic name, not visual)
- Class in `tailwind.config.ts` (referencing the token)
- Variant in the component (if it's a reusable shape)

Never:
- Hardcode a hex value in JSX.
- Add `style={{ background: '#FFE949' }}`.
- Use `!important`.
- Create a new color that "almost matches" an existing one. Use the existing one or add a token.

## When you finally redesign

You will. Every product redesigns. The point of tokens is that you can.

- Change the token values in `globals.css`.
- The entire app updates.
- You don't have to grep for hex codes across 47 files.

This is the payoff for doing Phase 3 of the blueprint before Phase 4.
