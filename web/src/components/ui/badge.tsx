import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-pill border px-2.5 py-0.5 t-mono',
  {
    variants: {
      variant: {
        default: 'border-fg/80 bg-bg text-fg',
        accent: 'border-fg bg-accent text-accent-fg',
        pos: 'border-pos/40 bg-pos/10 text-pos',
        neg: 'border-neg/40 bg-neg/10 text-neg',
        quiet: 'border-transparent bg-muted/15 text-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
