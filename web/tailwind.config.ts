import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        fg: 'rgb(var(--color-fg) / <alpha-value>)',
        rule: 'rgb(var(--color-rule) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--color-accent))',
          fg: 'rgb(var(--color-accent-fg))',
        },
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        pos: 'rgb(var(--color-pos) / <alpha-value>)',
        neg: 'rgb(var(--color-neg) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        popover: 'rgb(var(--color-popover) / <alpha-value>)',
        destructive: 'rgb(var(--color-neg) / <alpha-value>)',
      },
      borderRadius: {
        1: 'var(--radius-1)',
        2: 'var(--radius-2)',
        3: 'var(--radius-3)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        stamp: 'var(--shadow-stamp)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
      },
      transitionTimingFunction: {
        'out-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },
    },
  },
  plugins: [],
}

export default config
