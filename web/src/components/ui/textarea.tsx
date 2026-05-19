import * as React from 'react'
import { cn } from '@/lib/utils'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[88px] w-full rounded-2 border border-rule bg-bg px-3 py-2 text-sm text-fg placeholder:text-muted',
        'transition-[border-color,box-shadow] duration-fast ease-out-spring',
        'focus-visible:outline-none focus-visible:border-fg focus-visible:ring-2 focus-visible:ring-fg/15',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
